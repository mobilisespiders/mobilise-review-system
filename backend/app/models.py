from sqlalchemy import DateTime
from sqlalchemy import Column, Integer, String, ForeignKey, Text, TIMESTAMP, DATETIME
from sqlalchemy.sql import func
from app.database import Base
from datetime import datetime


class Department(Base):
    __tablename__ = "departments"
    department_id = Column(Integer, primary_key=True, index=True)
    department_name = Column(String(100), nullable=False)


class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True)
    form_url = Column(String(100))
    department_id = Column(Integer, ForeignKey("departments.department_id"))
    created_at = Column(TIMESTAMP, server_default=func.now())


class AssignmentBatch(Base):
    __tablename__ = "assignment_batches"
    id = Column(Integer, primary_key=True, index=True)
    generated_at = Column(TIMESTAMP, server_default=func.now())
    month_year = Column(String(7))  # e.g. "2026-04"
    label = Column(String(50))      # e.g. "April 2026"
    # Starting rotation index for the next automatically generated batch.
    round_value = Column(Integer, nullable=True)


class ReviewAssignment(Base):
    __tablename__ = "review_list"
    id = Column(Integer, primary_key=True, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.user_id"))
    reviewee_id = Column(Integer, ForeignKey("users.user_id"))
    batch_id = Column(Integer, ForeignKey("assignment_batches.id"), nullable=True)
    assigned_at = Column(TIMESTAMP, server_default=func.now())


class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.user_id"))
    reviewee_id = Column(Integer, ForeignKey("users.user_id"))
    rating = Column(Integer)
    review_text = Column(Text)
    # created_at = Column(TIMESTAMP, server_default=func.now())
    created_at = Column(DateTime, default=datetime.utcnow)


# class ReviewAssignment(Base):
#     __tablename__ = "review_assignments"

#     id = Column(Integer, primary_key=True, index=True)
#     reviewer_id = Column(Integer, ForeignKey("users.user_id"))
#     reviewee_id = Column(Integer, ForeignKey("users.user_id"))
#     created_at = Column(DateTime, default=datetime.utcnow)
