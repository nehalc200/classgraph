import course
import client as c
import majorclass as mj
from pydantic import TypeAdapter
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

    print("Dumping processed file to disk")
    plan_adapter = TypeAdapter(list[course.Plan])
    dump=plan_adapter.dump_json(processed, indent=4)
    with open("processed.json","w") as f:
        f.write(dump.decode('utf-8'))

    # phase 2 filtering

# phase 1 filter
def process_plans(plan: mj.Plan):
    rchildren=[]

    for i in plan.courses:
        for j in i:
            for k in j:
                if " or " in k.course_name:
                    children=[]
                    courses=k.course_name.split(" or ")
                    for c in courses:
                        tmp=course.CourseNode(type="COURSE",code=c.strip(),children=[])
                        children.append(tmp)
                    crs=course.CourseNode(type="OR",code="",children=children)
                else:
                    type="COURSE"
                    code=k.course_name.strip()
                    crs=course.CourseNode(type=type,code=code,children=[])
                rchildren.append(crs)
    root=course.CourseNode(type="AND",code="",children=rchildren)

    return course.Plan(
            code=plan.major_code,
            college=plan.college_code,
            length=plan.plan_length,
            requirements=[root],
            notes=""
            )

# phase 2 filter
def filter_plans(plan: course.Plan):
    # TODO: replace course code *, ^, / (see note) with empty spaces and collapse WS
    # this isn't what it looks like!
    filter_phrases=[
            "ahi",
            " ge",
            "ccer",
            "elective",
            "language",
            "dei",
            "concentration"
            ]
    filter_writing=[
            "cce " ,
            "wcwp ",
            "hum " ,
            "mcwp ",
            "mmw " ,
            "syn " ,
            "doc " ,
            "cat "
            ]
if __name__ == "__main__":
    main()
