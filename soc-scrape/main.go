package main

import (
	"encoding/json"
	"log"
	"os"
	"soc-scrape/lib"
	"soc-scrape/lib/courses"
	"strings"
	"time"
)

func main() {
	// url: https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesPreReq.htm?termCode=<TERM_CODE>&courseId=<COURSE_ID>
	log.Println("Initializing Client")
	cl, err := lib.InitializeClient()
	if err != nil {
		log.Fatal(err)
	}

	final_classes := make([]courses.CourseWritable, 0)
	departments, _ := cl.GetAllDepartments("WI26")
	for i, d := range departments {
		log.Printf("Making Search Request for Department %s (%d/%d)", d.Code, i+1, len(departments))
		sr := lib.NewSearchRequest("WI26", lib.TabDept)
		sr.AddDepartment(d.Code)
		res, err := cl.GetCourseList(sr)
		if err != nil {
			log.Fatal(err)
		}
		for _, v := range res {
			fixed_code := strings.ReplaceAll(v.Code, " ", "")
			res, err := cl.GetPrerequisites("WI26", fixed_code)
			if err != nil {
				v.Parseable = false
			} else {

				v.Parseable = true
			}
			v.PrereqAST = res

			writable := courses.CourseWritable{
				Course: &v,
				Meta: courses.Metadata{
					Version:     time.Now().Format(time.DateOnly),
					GeneratedAt: time.Now().UTC().Format(time.RFC3339),
				},
			}

			final_classes = append(final_classes, writable)
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
	data, _ := json.MarshalIndent(final_classes, "", "    ")
	f, _ := os.Create("SOC_list.json")
	f.Write(data)

}
