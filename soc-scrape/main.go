package main

import (
	"encoding/json"
	"log"
	"os"
	"soc-scrape/lib"
	"soc-scrape/lib/courses"
	"strings"
)

func main() {
	// url: https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesPreReq.htm?termCode=<TERM_CODE>&courseId=<COURSE_ID>
	log.Println("Initializing Client")
	cl, err := lib.InitializeClient()
	if err != nil {
		log.Fatal(err)
	}

	final_classes := make([]courses.Course, 0)
	departments, _ := cl.GetAllDepartments("WI26")
	for i, d := range departments {
		log.Printf("Making Search Request for Dep %s (%d/%d)", d.Code,i+1,len(departments))
		sr := lib.NewSearchRequest("WI26", lib.TabDept)
		sr.AddDepartment(d.Code)
		res, err := cl.GetCourseList(sr)
		if err != nil {
			log.Fatal(err)
		}
		for _, v := range res {
			fixed_code := strings.ReplaceAll(v.Code, " ", "")
			res, _ := cl.GetPrerequisites("WI26", fixed_code)
			v.Dept=d.Code
			v.PrereqAST = res
			final_classes = append(final_classes, v)
			//fmt.Println(v.Code, " requirements:")
			//if len(res.Items) < 1 || res.Type != "AND" {
			//	fmt.Println("No requirements!")
			//}
			//for n, j := range res.Items {
			//	if j.Type != "COURSE" {
			//		for l := 0; l < len(j.Items); l++ {
			//			if l != 0 {
			//				fmt.Print(j.Type, " ")
			//			}
			//			fmt.Print(j.Items[l].CourseID, " ")
			//		}
			//	} else {
			//		fmt.Print(j.CourseID)
			//	}
			//	fmt.Println()
			//	if n != len(res.Items) {
			//		fmt.Println(res.Type)
			//	}
			//}
		}
	}
	data,_:=json.MarshalIndent(final_classes,"","    ")
	f,_:=os.Create("out.json")
	f.Write(data)

}
