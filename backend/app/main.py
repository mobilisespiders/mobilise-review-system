import os
import logging
import time
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.logging_config import setup_logging
from collections import defaultdict

logger = setup_logging()
load_dotenv(Path(__file__).resolve().parents[1] / ".env")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]


# Import DB session
from app.database import get_db, Base, engine
from app import models, schemas
# Import models (tables)
import app.models as models


from fastapi.middleware.cors import CORSMiddleware
import random  # for random selection

from collections import defaultdict
from app.email_utils import send_html_email
# Create FastAPI app

if engine is not None:
    Base.metadata.create_all(bind=engine)
else:
    logger.warning("Database engine is not configured; skipping table creation")
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.perf_counter()
    client_host = request.client.host if request.client else "unknown"

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.exception(
            "Unhandled request error | method=%s path=%s client=%s duration_ms=%.2f",
            request.method,
            request.url.path,
            client_host,
            duration_ms,
        )
        raise

    duration_ms = (time.perf_counter() - start_time) * 1000
    log_level = logging.ERROR if response.status_code >= 500 else logging.INFO
    logger.log(
        log_level,
        "Request completed | method=%s path=%s status_code=%s client=%s duration_ms=%.2f",
        request.method,
        request.url.path,
        response.status_code,
        client_host,
        duration_ms,
    )
    return response

@app.get("/")
def home():
    logger.info("Health check endpoint called")
    return {"message": "Backend is running"}



@app.post("/departments/")
def create_department(name: str, db: Session = Depends(get_db)):
    clean_name = name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Department name is required")

    existing_department = db.query(models.Department).filter(
        func.lower(models.Department.department_name) == clean_name.lower()
    ).first()
    if existing_department:
        raise HTTPException(status_code=400, detail="Department already exists")
    
    # Create department object (NOT yet saved in DB)
    dept = models.Department(department_name=clean_name)
    
    # Add to session (like staging area)
    db.add(dept)
    
    # Save to database (commit = permanent save)
    db.commit()
    
    # Refresh gets updated data (like auto-generated ID)
    db.refresh(dept)
    
    # Return created department
    logger.info("Department created | department_id=%s name=%s", dept.department_id, dept.department_name)
    return dept


@app.post("/users/")
def create_user(
    name: str,
    email: str,
    department_id: int,
    form_url: str = None,
    db: Session = Depends(get_db)
):
    clean_name = name.strip()
    clean_email = email.strip().lower()
    clean_form_url = form_url.strip() if form_url else None

    if not clean_name:
        raise HTTPException(status_code=400, detail="User name is required")

    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="A valid email is required")

    department = db.query(models.Department).filter(
        models.Department.department_id == department_id
    ).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    existing_user = db.query(models.User).filter(
        func.lower(models.User.email) == clean_email
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User email already exists")

    if clean_form_url:
        parsed_url = urlparse(clean_form_url)
        if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
            raise HTTPException(status_code=400, detail="Employee URL must be a valid http or https URL")
    
    # Create user object
    user = models.User(
        name=clean_name,
        email=clean_email,
        form_url=clean_form_url,
        department_id=department_id
    )
    
    # Add to session
    db.add(user)
    
    # Save to DB
    db.commit()
    
    # Get updated data (like user_id)
    db.refresh(user)
    
    # Return created user
    logger.info("User created | user_id=%s email=%s department_id=%s", user.user_id, user.email, user.department_id)
    return user


@app.get("/users/")
def get_users(db: Session = Depends(get_db)):
    
    # Query all users from DB
    users = db.query(models.User).order_by(
        models.User.department_id,
        models.User.user_id,
    ).all()
    
    # Return list of users
    return users


@app.get("/departments/")
def get_departments(db: Session = Depends(get_db)):
    
    # Fetch all departments 
    departments = db.query(models.Department).all()
    
    return departments


@app.post("/assign-reviews/")
def assign_reviews(num: int = 4, db: Session = Depends(get_db)):
    import datetime

    logger.info("Automatic review assignment started | requested_reviews_per_user=%s", num)

    users = db.query(models.User).order_by(
        models.User.department_id,
        models.User.user_id,
    ).all()
    if len(users) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least two users are required to generate review assignments",
        )

    if num < 1:
        raise HTTPException(status_code=400, detail="Assignments per user must be at least 1")

    max_assignments_per_user = len(users) - 1
    if num > max_assignments_per_user:
        raise HTTPException(
            status_code=400,
            detail=f"Assignments per user cannot exceed {max_assignments_per_user}",
        )

    latest_batch = db.query(models.AssignmentBatch).order_by(
        models.AssignmentBatch.id.desc()
    ).first()

    stored_round_value = latest_batch.round_value if latest_batch else None
    round_num = stored_round_value or 0
    if round_num == 0:
        round_num += 1

    if round_num + num > len(users):
        raise HTTPException(
            status_code=400,
            detail=(
                "The saved round position plus assignments per user cannot exceed "
                f"{len(users)}. Choose {len(users) - round_num} or fewer assignments "
                "for this batch."
            ),
        )

    # Get current month year
    now = datetime.datetime.now()
    month_year_str = now.strftime("%Y-%m")
    month_label = now.strftime("%B %Y")

    dept_users_map = defaultdict(list)
    empty_list = []
    
    all_users_list = []

    for user in users:
        dept_users_map[user.department_id].append(user)

    for value in dept_users_map.values():

        a = []
        for i in value:
            a.append(i.user_id)
        empty_list.append(a)

    max_length = max(empty_list,key=len)

    for x in range(len(max_length)):
        for y in empty_list:
            if len(y) > x:
                all_users_list.append(y[x]) 
            else:
                pass

    all_users_rotation_list = all_users_list + all_users_list[:num + round_num]
    user_assign_dict = dict()

    for element_index, each_user_id in enumerate(all_users_list):
        start_index = element_index + round_num
        last_index = start_index + num
        user_assign_dict[each_user_id] = all_users_rotation_list[start_index:last_index]

    first_user_id = all_users_list[0]
    first_user_assignments = user_assign_dict[first_user_id]
    last_assigned_user_id = first_user_assignments[-1]
    next_round_value = all_users_list.index(last_assigned_user_id) + 1
    if next_round_value >= len(all_users_list):
        next_round_value = 0

    self_assignments = [
        reviewer_id
        for reviewer_id, assigned_user_ids in user_assign_dict.items()
        if reviewer_id in assigned_user_ids
    ]
    if self_assignments:
        logger.error(
            "Automatic assignment generated self-review pairs | reviewer_ids=%s",
            self_assignments,
        )
        raise HTTPException(
            status_code=400,
            detail="Generated assignment contains self-review. Please change round number or assignment count.",
        )

    # Create new assignment batch only after generated assignments pass validation.
    batch = models.AssignmentBatch(
        month_year=month_year_str,
        label=month_label,
        round_value=next_round_value,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    
    # return(users, dept_users_map, empty_list,all_users_list, user_assign_dict)

    
    for tar, tar_values in user_assign_dict.items():
        for i in tar_values:
            assignment = models.ReviewAssignment(
                reviewer_id=int(tar),
                reviewee_id=i,
                batch_id=batch.id
            )
            db.add(assignment)

    

    # assignments_map = defaultdict(list)
    

    db.commit()
    batchId = batch.id
    review_list_data = db.query(models.ReviewAssignment.reviewer_id,models.ReviewAssignment.reviewee_id,models.ReviewAssignment.batch_id).filter(models.ReviewAssignment.batch_id == batchId).all()
    
    safe_review_list = [
        {
            "reviewer_id": row.reviewer_id,
            "reviewee_id": row.reviewee_id,
            "batch_id": row.batch_id
        }
        for row in review_list_data
    ]

    user_by_id = {user.user_id: user for user in users}

    safe_users = [
        {
            "user_id": user.user_id,
            "name": user.name,
            "department_id": user.department_id,
            "email": user.email,
            "form_url": user.form_url,
        }
        for user in users
    ]

    return {
        "batch_id": batch.id,
        "round_used": round_num,
        "next_round_value": next_round_value,
        "reviewer_list": safe_review_list,
        "users": safe_users,
        "message": "Assignments created. Review the list before sending emails.",
        "all_users": {
            reviewer_id: [
                {
                    "user_id": assigned_id,
                    "name": user_by_id[assigned_id].name,
                    "email": user_by_id[assigned_id].email,
                    "department_id": user_by_id[assigned_id].department_id,
                    "form_url": user_by_id[assigned_id].form_url,
                }
                for assigned_id in assigned_user_ids
                if assigned_id in user_by_id
            ]
            for reviewer_id, assigned_user_ids in user_assign_dict.items()
        }
    }


    # db.commit()
    # return {"batch_id": batch.id,"Reviwer_list":review_list_data,"Users": users,"message": "Assignments created and emails sent!", "batch_id": batch.id, "all Users":user_assign_dict}
    
    

    # # SEND EMAILS
    # assignments_map = defaultdict(list)

    # for user in users:
    #     assigned_people = assignments_map[user.user_id]

    #     if not assigned_people:
    #         continue

    #     assigned_details = [
    #          {
    #              "name": p.name,
    #              "email": p.email,
    #              "form_url": p.form_url
    #          } for p in assigned_people
    #     ]

    #     email_sent = send_html_email(
    #         to_email=user.email,
    #         subject=f"Review Assignment - {month_label}",
    #         recipient_name=user.name,
    #         assigned_users=assigned_details
    #     )
    #     if not email_sent:
    #         logger.error("Assignment email failed | user_id=%s email=%s batch_id=%s", user.user_id, user.email, batch.id)

    # logger.info("Automatic review assignment completed | batch_id=%s users=%s", batch.id, len(users))
    # # return {"message": "Assignments created and emails sent!", "batch_id": batch.id}

    
    print(dept_users_map, "Department map")
    print(empty_list, "Empty List")
    print(all_users_list, "All Users List")


    # Form Here-----------------------

    # past_assignments = db.query(models.ReviewAssignment).all()
    
    # past_pairs = defaultdict(set)
    # for pa in past_assignments:
    #     past_pairs[pa.reviewer_id].add(pa.reviewee_id)

    # assignments_map = defaultdict(list)

    # # Group users by department map for easier balancing
    # dept_users_map = defaultdict(list)
    # for user in users:
    #     dept_users_map[user.department_id].append(user)

    # for user in users:
    #     # Get users never reviewed
    #     eligible_users = [u for u in users if u.user_id != user.user_id and u.user_id not in past_pairs[user.user_id]]
        
    #     # If exhausted all users, reset eligibility
    #     if len(eligible_users) < num:
    #          past_pairs[user.user_id] = set()
    #          eligible_users = [u for u in users if u.user_id != user.user_id]
             
    #     assigned_users = []
        
    #     # Balance cross department
    #     other_dept_users = [u for u in eligible_users if u.department_id != user.department_id]
    #     same_dept_users = [u for u in eligible_users if u.department_id == user.department_id]
        
    #     # Shuffle randomly
    #     random.shuffle(other_dept_users)
    #     random.shuffle(same_dept_users)
        
    #     # Let's say we want at least 50% from other departments if possible
    #     num_other = min(len(other_dept_users), (num + 1) // 2)
    #     assigned_users.extend(other_dept_users[:num_other])
        
    #     needed = num - len(assigned_users)
    #     assigned_users.extend(same_dept_users[:needed])
        
    #     # If we still need more, take remaining from other depts
    #     if len(assigned_users) < num:
    #         remaining_other = other_dept_users[num_other:]
    #         more_needed = num - len(assigned_users)
    #         assigned_users.extend(remaining_other[:more_needed])
            
    #     for target in assigned_users:
    #         assignment = models.ReviewAssignment(
    #             reviewer_id=user.user_id,
    #             reviewee_id=target.user_id,
    #             batch_id=batch.id
    #         )
    #         db.add(assignment)

    #         # Store for email
    #         assignments_map[user.user_id].append(target)
    #         # update past pairs so we don't pick them immediately again in manual or something
    #         past_pairs[user.user_id].add(target.user_id)

    # db.commit()

    # # SEND EMAILS
    # for user in users:
    #     assigned_people = assignments_map[user.user_id]

    #     if not assigned_people:
    #         continue

    #     assigned_details = [
    #          {
    #              "name": p.name,
    #              "email": p.email,
    #              "form_url": p.form_url
    #          } for p in assigned_people
    #     ]

    #     # email_sent = send_html_email(
    #     #     to_email=user.email,
    #     #     subject=f"Review Assignment - {month_label}",
    #     #     recipient_name=user.name,
    #     #     assigned_users=assigned_details
    #     # )
    #     # if not email_sent:
    #     #     logger.error("Assignment email failed | user_id=%s email=%s batch_id=%s", user.user_id, user.email, batch.id)

    # logger.info("Automatic review assignment completed | batch_id=%s users=%s", batch.id, len(users))
    # return {"message": "Assignments created and emails sent!", "batch_id": batch.id}

# @app.post("/submit-review/")
# def submit_review(review: schemas.ReviewCreate, db: Session = Depends(get_db)):
    
#     # 1 Check if reviewer already gave 4 reviews
#     review_count = db.query(models.Review).filter(
#         models.Review.reviewer_id == review.reviewer_id
#     ).count()

#     if review_count >= 4:
#         raise HTTPException(status_code=400, detail="Review limit reached (4 only)")

#     # 2 Prevent self-review
#     if review.reviewer_id == review.reviewee_id:
#         raise HTTPException(status_code=400, detail="You cannot review yourself")

#     # 3 Save review
#     new_review = models.Review(
#         reviewer_id=review.reviewer_id,
#         reviewee_id=review.reviewee_id,
#         rating=review.rating,
#         review_text=review.review_text
#     )

#     db.add(new_review)
#     db.commit()

#     return {"message": "Review submitted successfully"}


@app.post("/submit-review/")
def submit_review(review: schemas.ReviewCreate, db: Session = Depends(get_db)):

    # 1 Check assignment exists
    assignment = db.query(models.ReviewAssignment).filter(
        models.ReviewAssignment.reviewer_id == review.reviewer_id,
        models.ReviewAssignment.reviewee_id == review.reviewee_id
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=400,
            detail="You are not allowed to review this user"
        )

    # 3 Prevent duplicate review
    existing_review = db.query(models.Review).filter(
        models.Review.reviewer_id == review.reviewer_id,
        models.Review.reviewee_id == review.reviewee_id
    ).first()

    if existing_review:
        raise HTTPException(
            status_code=400,
            detail="You already reviewed this user"
        )

    # 4 Save review
    new_review = models.Review(
        reviewer_id=review.reviewer_id,
        reviewee_id=review.reviewee_id,
        rating=review.rating,
        review_text=review.review_text
    )

    db.add(new_review)
    db.commit()

    logger.info(
        "Review submitted | reviewer_id=%s reviewee_id=%s rating=%s",
        review.reviewer_id,
        review.reviewee_id,
        review.rating,
    )
    return {"message": "Review submitted successfully"}



@app.get("/submit-review/")
def get_reviews(db: Session = Depends(get_db)):
    
    # Query all users from DB
    reviews = db.query(models.Review).all()
    
    # Return list of users
    return reviews
  


@app.get("/reviews/")
def get_all_reviews(db: Session = Depends(get_db)):
    
    # Fetch all reviews
    reviews = db.query(models.Review).all()
    
    return reviews


@app.get("/reviews/filter/")
def filter_reviews(
    reviewer_id: int = None,
    reviewee_id: int = None,
    rating: int = None,
    db: Session = Depends(get_db)
):
    
    query = db.query(models.Review)

    # Apply filters dynamically
    if reviewer_id:
        query = query.filter(models.Review.reviewer_id == reviewer_id)

    if reviewee_id:
        query = query.filter(models.Review.reviewee_id == reviewee_id)

    if rating:
        query = query.filter(models.Review.rating == rating)

    return query.all()


@app.get("/reviews/average/")
def average_rating(db: Session = Depends(get_db)):
    
    result = db.query(
        models.Review.reviewee_id,
        func.avg(models.Review.rating).label("avg_rating")
    ).group_by(models.Review.reviewee_id).all()
    
    return result

@app.get("/reviews/detailed/")
def detailed_reviews(db: Session = Depends(get_db)):
    
    result = db.query(
        models.Review.id,
        models.User.name.label("reviewer_name"),
        models.Review.reviewee_id,
        models.Review.rating,
        models.Review.review_text
    ).join(
        models.User,
        models.Review.reviewer_id == models.User.user_id
    ).all()
    
    return result


@app.get("/assignment-batches/")
def get_assignment_batches(db: Session = Depends(get_db)):
    return db.query(models.AssignmentBatch).order_by(models.AssignmentBatch.id.desc()).all()


@app.get("/assignments/")
def get_assignments(batch_id: int = None, db: Session = Depends(get_db)):
    query = db.query(models.ReviewAssignment)
    if batch_id:
        query = query.filter(models.ReviewAssignment.batch_id == batch_id)
    return query.all()


@app.post("/assignment-batches/{batch_id}/send-emails")
def send_assignment_batch_emails(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(models.AssignmentBatch).filter(
        models.AssignmentBatch.id == batch_id
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Assignment batch not found")

    assignments = db.query(models.ReviewAssignment).filter(
        models.ReviewAssignment.batch_id == batch_id
    ).all()
    if not assignments:
        raise HTTPException(status_code=404, detail="No assignments found for this batch")

    user_ids = set()
    for assignment in assignments:
        user_ids.add(assignment.reviewer_id)
        user_ids.add(assignment.reviewee_id)

    users = db.query(models.User).filter(models.User.user_id.in_(user_ids)).all()
    user_by_id = {user.user_id: user for user in users}

    assignments_by_reviewer = defaultdict(list)
    for assignment in assignments:
        reviewer = user_by_id.get(assignment.reviewer_id)
        reviewee = user_by_id.get(assignment.reviewee_id)
        if reviewer and reviewee:
            assignments_by_reviewer[reviewer.user_id].append(reviewee)

    email_success = 0
    email_failed = 0

    for reviewer_id, reviewees in assignments_by_reviewer.items():
        reviewer = user_by_id.get(reviewer_id)
        if not reviewer:
            email_failed += 1
            continue

        assigned_users_data = [
            {
                "name": reviewee.name,
                "email": reviewee.email,
                "form_url": reviewee.form_url,
            }
            for reviewee in reviewees
        ]

        success = send_html_email(
            to_email=reviewer.email,
            subject="MTI feedback",
            recipient_name=reviewer.name,
            assigned_users=assigned_users_data,
        )

        if success:
            email_success += 1
        else:
            email_failed += 1
            logger.error(
                "Assignment batch email failed | batch_id=%s user_id=%s email=%s",
                batch_id,
                reviewer.user_id,
                reviewer.email,
            )

    logger.info(
        "Assignment batch emails completed | batch_id=%s emails_sent=%s emails_failed=%s",
        batch_id,
        email_success,
        email_failed,
    )
    return {
        "message": "Assignment emails processed",
        "batch_id": batch_id,
        "emails_sent": email_success,
        "emails_failed": email_failed,
    }


@app.put("/assignment-batches/{batch_id}/reviewers/{reviewer_id}/assignments")
def update_reviewer_batch_assignments(
    batch_id: int,
    reviewer_id: int,
    request: schemas.AssignmentUpdateRequest,
    db: Session = Depends(get_db),
):
    batch = db.query(models.AssignmentBatch).filter(
        models.AssignmentBatch.id == batch_id
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Assignment batch not found")

    reviewer = db.query(models.User).filter(
        models.User.user_id == reviewer_id
    ).first()
    if not reviewer:
        raise HTTPException(status_code=404, detail="Reviewer not found")

    reviewee_ids = list(dict.fromkeys(request.reviewee_ids))
    if not reviewee_ids:
        raise HTTPException(status_code=400, detail="At least one reviewee is required")

    if reviewer_id in reviewee_ids:
        raise HTTPException(status_code=400, detail="Reviewer cannot review themselves")

    reviewees = db.query(models.User).filter(
        models.User.user_id.in_(reviewee_ids)
    ).all()
    if len(reviewees) != len(reviewee_ids):
        raise HTTPException(status_code=404, detail="One or more reviewees were not found")

    db.query(models.ReviewAssignment).filter(
        models.ReviewAssignment.batch_id == batch_id,
        models.ReviewAssignment.reviewer_id == reviewer_id,
    ).delete(synchronize_session=False)

    for reviewee_id in reviewee_ids:
        db.add(models.ReviewAssignment(
            batch_id=batch_id,
            reviewer_id=reviewer_id,
            reviewee_id=reviewee_id,
        ))

    db.commit()

    logger.info(
        "Reviewer assignments updated | batch_id=%s reviewer_id=%s reviewees=%s",
        batch_id,
        reviewer_id,
        len(reviewee_ids),
    )
    return {
        "message": "Reviewer assignments updated",
        "batch_id": batch_id,
        "reviewer_id": reviewer_id,
        "assignments_updated": len(reviewee_ids),
    }



# @app.delete("/users/{user_id}")
# def delete_assignment(user_id: int, db: Session = Depends(get_db)):

#     db.query(models.User).filter(
#         models.User.user_id == user_id
#     ).delete()
#     db.commit()
#     return {"message": "User deleted"}



@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):

    #  Delete related reviews
    db.query(models.Review).filter(
        (models.Review.reviewer_id == user_id) |
        (models.Review.reviewee_id == user_id)
    ).delete(synchronize_session=False)

    #  Delete assignments
    db.query(models.ReviewAssignment).filter(
        (models.ReviewAssignment.reviewer_id == user_id) |
        (models.ReviewAssignment.reviewee_id == user_id)
    ).delete(synchronize_session=False)

    #  Delete user
    db.query(models.User).filter(models.User.user_id == user_id).delete()

    db.commit()

    logger.info("User deleted | user_id=%s", user_id)
    return {"message": f"User {user_id} deleted"}


@app.delete("/users/")
def delete_all_users(db: Session = Depends(get_db)):

    #  Delete all reviews
    db.query(models.Review).delete()

    #  Delete all assignments
    db.query(models.ReviewAssignment).delete()

    #  Delete all users
    db.query(models.User).delete()

    db.commit()

    logger.warning("All users, assignments, and reviews deleted")
    return {"message": "All users deleted"}


@app.delete("/departments/{department_id}")
def delete_department(department_id: int, db: Session = Depends(get_db)):

    department_user_ids = [
        row.user_id
        for row in db.query(models.User.user_id)
        .filter(models.User.department_id == department_id)
        .all()
    ]

    if department_user_ids:
        db.query(models.Review).filter(
            or_(
                models.Review.reviewer_id.in_(department_user_ids),
                models.Review.reviewee_id.in_(department_user_ids),
            )
        ).delete(synchronize_session=False)

        db.query(models.ReviewAssignment).filter(
            or_(
                models.ReviewAssignment.reviewer_id.in_(department_user_ids),
                models.ReviewAssignment.reviewee_id.in_(department_user_ids),
            )
        ).delete(synchronize_session=False)

        db.query(models.User).filter(
            models.User.user_id.in_(department_user_ids)
        ).delete(synchronize_session=False)

    db.query(models.Department).filter(
        models.Department.department_id == department_id
    ).delete()

    db.commit()

    logger.info("Department deleted | department_id=%s", department_id)
    return {"message": "Department deleted"}


# ================= MANUAL ASSIGN =================

@app.post("/manual-assign/")
def manual_assign(request: schemas.ManualAssignRequest, db: Session = Depends(get_db)):
    """
    Manually assign selected users to selected Reviewer and send email notifications.
    - reviewer_ids: list of user IDs who will receive the assignment (Reviewer)
    - reviewee_ids: list of user IDs to be assigned (reviewees)
    """

    # Validate Reviewer IDs
    m_reviewers = db.query(models.User).filter(
        models.User.user_id.in_(request.reviewer_ids)
    ).all()

    logger.info(
        "Manual assignment started | reviewers=%s reviewees=%s",
        len(request.reviewer_ids),
        len(request.reviewee_ids),
    )

    overlapping_user_ids = set(request.reviewer_ids).intersection(request.reviewee_ids)
    if overlapping_user_ids:
        logger.warning(
            "Manual assignment rejected because users were selected as both reviewer and reviewee | user_ids=%s",
            sorted(overlapping_user_ids),
        )
        raise HTTPException(
            status_code=400,
            detail="A user cannot be both reviewer and reviewee in the same manual assignment",
        )

    if not m_reviewers:
        raise HTTPException(status_code=404, detail="No valid recipients found")

    # Validate Reviewee IDs
    assignees = db.query(models.User).filter(
        models.User.user_id.in_(request.reviewee_ids)
    ).all()

    if not assignees:
        raise HTTPException(status_code=404, detail="No valid assignees found")

    created_count = 0
    skipped_count = 0
    email_success = 0
    email_failed = 0
    manual_batch = models.AssignmentBatch(
        month_year=time.strftime("%Y-%m"),
        label=f"Manual Assignment - {time.strftime('%d %B %Y %I:%M %p')}"
    )
    db.add(manual_batch)
    db.commit()
    db.refresh(manual_batch)

    for recipient in m_reviewers:
        assigned_user_details = []

        for assignee in assignees:
            # Skip self-assignment
            if recipient.user_id == assignee.user_id:
                skipped_count += 1
                continue

            # Check if assignment already exists inside this manual batch.
            existing = db.query(models.ReviewAssignment).filter(
                models.ReviewAssignment.reviewer_id == recipient.user_id,
                models.ReviewAssignment.reviewee_id == assignee.user_id,
                models.ReviewAssignment.batch_id == manual_batch.id,
            ).first()

            if existing:
                skipped_count += 1
                # Still include in email even if already assigned
                assigned_user_details.append({
                    "name": assignee.name,
                    "email": assignee.email,
                    "role": getattr(assignee, "role", ""),
                    "form_url": assignee.form_url
                })
                continue

            # Create new assignment
            assignment = models.ReviewAssignment(
                reviewer_id=recipient.user_id,
                reviewee_id=assignee.user_id,
                batch_id=manual_batch.id,
            )
            db.add(assignment)
            created_count += 1

            assigned_user_details.append({
                "name": assignee.name,
                "email": assignee.email,
                "role": getattr(assignee, "role", ""),
                "form_url": assignee.form_url
            })

        if assigned_user_details:
            success = send_html_email(
                to_email=recipient.email,
                subject="MTI feedback",
                recipient_name=recipient.name,
                assigned_users=assigned_user_details
            )
            if success:
                email_success += 1
            else:
                email_failed += 1
                logger.error(
                    "Manual assignment email failed | user_id=%s email=%s",
                    recipient.user_id,
                    recipient.email,
                )

    db.commit()

    logger.info(
        "Manual assignment completed | batch_id=%s created=%s skipped=%s emails_sent=%s emails_failed=%s",
        manual_batch.id,
        created_count,
        skipped_count,
        email_success,
        email_failed,
    )
    return {
        "message": "Manual assignments processed!",
        "batch_id": manual_batch.id,
        "batch_label": manual_batch.label,
        "assignments_created": created_count,
        "assignments_skipped": skipped_count,
        "emails_sent": email_success,
        "emails_failed": email_failed
    }

