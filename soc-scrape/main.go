package main

import (
	"fmt"
	"log"
	"soc-scrape/lib"
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
	sr.AddDepartment("AIP ")
	res, err := cl.GetCourseList(sr)
	if err != nil {
		log.Fatal(err)
	}
	for _,v:=range res{
		fmt.Printf("%s%s\n",v.Department,v.Numerical)
	}
}
