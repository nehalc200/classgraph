package main

import (
	"fmt"
	"log"
	"soc-scrape/lib"
	"strings"
)

func main() {
	// url: https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesPreReq.htm?termCode=<TERM_CODE>&courseId=<COURSE_ID>
	log.Println("Initializing Client")
	cl, err := lib.InitializeClient()
	if err != nil {
		log.Fatal(err)
	}
	//departments,_:=cl.GetAllDepartments("WI26")
	//for _,d:=range departments{
	//	fmt.Printf("%s : %s\n",d.Code,d.Expansion)
	//}
	log.Println("Making Search Request")
	sr := lib.NewSearchRequest("WI26", lib.TabDept)
	sr.AddDepartment("DSC ")
	res, err := cl.GetCourseList(sr)
	if err != nil {
		log.Fatal(err)
	}
	for _, v := range res {
		fixed_code := strings.ReplaceAll(v.Code, " ", "")
		res, _ := cl.GetPrerequisites("WI26", fixed_code)
		v.PrereqAST=res
		fmt.Println(v.Code, " requirements:")
		if len(res.Items) < 1 || res.Type != "AND" {
			fmt.Println("No requirements!")
		}
		for n, j := range res.Items {
			if j.Type != "COURSE" {
				for l := 0; l < len(j.Items); l++ {
					if l != 0 {
						fmt.Print(j.Type, " ")
					}
					fmt.Print(j.Items[l].CourseID, " ")
				}
			} else {
				fmt.Print(j.CourseID)
			}
			fmt.Println()
			if n != len(res.Items) {
				fmt.Println(res.Type)
			}
		}
	}
}
