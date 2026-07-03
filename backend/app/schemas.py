from pydantic import BaseModel
from typing import List

class ReviewCreate(BaseModel):
    reviewer_id: int
    reviewee_id: int
    rating: int
    review_text: str


class ManualAssignRequest(BaseModel):
    reviewer_ids: List[int]
    reviewee_ids: List[int]


class AssignmentUpdateRequest(BaseModel):
    reviewee_ids: List[int]
