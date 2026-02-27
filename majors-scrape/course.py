from pydantic import BaseModel, ConfigDict
class CourseNode(BaseModel):
    model_config = ConfigDict(strict=True)
    type: str # OR, AND, COURSE
    code: str # only if type COURSE
    children: list[CourseNode]

class Plan(BaseModel):
    code: str
    college: str
    notes: str
    length: int
    requirements: list[CourseNode]
