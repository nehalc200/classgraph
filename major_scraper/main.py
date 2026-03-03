import course
import client as c
import majorclass as mj
from pydantic import TypeAdapter
import regex as re
def main():
    """
    cl=c.Client(2024)
    ctrl=cl.get_controls()

    deps=ctrl.departments
    clg=ctrl.colleges[0]

    print("Discovering majors")
    majors=[]
    for dep in deps:
        majors=majors+cl.get_majors(dep,clg)
    print(f"{len(majors)} majors discovered")

    print("Discovering plans")
    plans=[]
    for mjr in majors:
        print(mjr.major_code)
        plan_set=cl.get_plan(clg,mjr).root
        plans+=plan_set
    print(f"{len(plans)} plans discovered")

    print("dumping intermediate file to disk")
    plan_adapter = TypeAdapter(list[mj.Plan])
    dump=plan_adapter.dump_json(plans, indent=4)
    with open("intermediate.json","w") as f:
        f.write(dump.decode('utf-8'))
    """

    plan_adapter = TypeAdapter(list[mj.Plan])
    f=open("intermediate.json","r")
    plans=plan_adapter.validate_json(f.read())


    # phase 1 filtering
    print("Processing plans")
    processed=list(map(process_plans, plans))
    processed=list(map(filter_plans, processed))

    print("Dumping processed file to disk")
    plan_adapter = TypeAdapter(list[course.Plan])
    dump=plan_adapter.dump_json(processed, indent=4)
    with open("processed.json","w") as f:
        f.write(dump.decode('utf-8'))

    # phase 2 filtering

def sanitize_course_name(s: str)->str:
    r=(s
       .replace("*"," ")
       .replace("/"," ").replace("^"," "))
    r=re.sub(r"\(.*?\)"," ",r) # replace notes
    r=re.sub(" +"," ",r)
    r=r.strip()
    return r
# phase 1 filter
def process_plans(plan: mj.Plan):
    root_children=[]

    for i in plan.courses:
        for j in i:
            for k in j:
                if k.course_type!="DEPARTMENT" or "subject domain" in k.course_name.lower(): # filter out college requirements; subject domain works here for some reason?
                    continue
                if " or " in k.course_name:
                    children=[]
                    courses=k.course_name.split(" or ")
                    for c in courses:
                        tmp=course.CourseNode(type="COURSE",code=sanitize_course_name(c),children=[])
                        # FIX: MATH 18 or 31AH splits into "MATH 18" and "31AH"
                        children.append(tmp)
                    crs=course.CourseNode(type="OR",code="",children=children)
                else:
                    type="COURSE"
                    code=sanitize_course_name(k.course_name.strip())
                    crs=course.CourseNode(type=type,code=code,children=[])
                root_children.append(crs)
    root=course.CourseNode(type="AND",code="",children=root_children)

    return course.Plan(
            code=plan.major_code,
            college=plan.college_code,
            length=plan.plan_length,
            requirements=[root],
            notes=""
            )

# phase 2 filter
def filter_plans(plan: course.Plan):
    # this isn't what it looks like!
    # rf"{word}"
    filter_phrases=[
            "ahi",
            "ge",
            "ccer",
            "elective",
            "language",
            "dei",
            "concentration",
            "major"
            "programming"
            "te"
            "subject domain"
            ]
    new_children:list[course.CourseNode]=[]
    for c in plan.requirements[0].children:
        name=c.code.lower()
        add=True
        for p in filter_phrases:
            if p in name or p==name:
                add=False
        if add:
            new_children.append(c)
    plan.requirements[0].children=new_children
    return plan

if __name__ == "__main__":
    main()
