from pydantic import BaseModel, ConfigDict, RootModel

# basic search controls
class Department(BaseModel):
    model_config = ConfigDict(strict=True)
    code: str
    description: str
    name: str

class College(BaseModel):
    model_config = ConfigDict(strict=True)
    code: str
    name: str

# basic major enumeration
class SearchControlResponse(BaseModel):
    model_config = ConfigDict(strict=True)
    years: list[int]
    departments: list[Department]
    colleges: list[College]

class Major(BaseModel):
    model_config = ConfigDict(strict=True)
    major: str
    major_code: str
class LoadMajorsResponse(RootModel):
    model_config = ConfigDict(strict=True)
    root: list[Major]

# basic plan enumeration
# comments are too big and take up too much space so they are skipped
class Course(BaseModel):
    course_id: int 
    plan_id: int
    course_name: str
    units: str
    course_type: str
    year_taken: int
    quarter_taken: int
    ge_major_overlap: bool

"""
class Quarter(RootModel):
    model_config = ConfigDict(strict=True)
    root: list[Course]

class Year(RootModel):
    model_config = ConfigDict(strict=True)
    root: list[Quarter]
"""

class Plan(BaseModel):
    model_config = ConfigDict(strict=True)
    planId: int
    # list of years; years are list of quarters; quarters are lists of courses
    courses: list[list[list[Course]]]
    college_code: str
    college_name: str
    major_code: str
    department: str
    start_year: int
    major_title: str
    plan_length: int

class LoadPlansResponse(RootModel):
    model_config = ConfigDict(strict=True)
    # index 0: 4-year; index 1: transfer/3-yr finish index 2: populated only if  
    root: list[Plan]
