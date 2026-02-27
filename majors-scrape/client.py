import majorclass as mj
import httpx
import majorclass as mj

class Client():
    def __init__(self, year: int):
        self.year=year
        self.htpc=httpx.Client()
        self.baseurl="https://plans.ucsd.edu/controller.php"
    
    # get all basic metadata (we want to run this at least once)
    def get_controls(self) -> mj.SearchControlResponse:
        rps=self.htpc.get(f"{self.baseurl}?action=LoadSearchControls")
        res=mj.SearchControlResponse.model_validate_json(rps.text)
        return res
    
    # get majors by department and college. in all honestly college doesn't matter, but it is required.
    def get_majors(self, department: mj.Department, college: mj.College)->list[mj.Major]:
        rps=self.htpc.get(f"{self.baseurl}?action=LoadMajors&year={self.year}&college={college.code}&department={department.code}")
        res=mj.LoadMajorsResponse.model_validate_json(rps.text)
        return res.root
    
    # get a plan for a major and college
    def get_plan(self,college: mj.College, major: mj.Major)->mj.LoadPlansResponse:
        rps=self.htpc.get(f"{self.baseurl}?action=LoadPlans&college={college.code}&year={self.year}&major={major.major_code}")
        res=mj.LoadPlansResponse.model_validate_json(rps.text)
        return res
