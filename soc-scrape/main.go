package main

import (
	//"fmt"
	"fmt"
	"io"
	"log"
	"soc-scrape/lib"
)

func main() {
	// url: https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesPreReq.htm?termCode=<TERM_CODE>&courseId=<COURSE_ID>
	cl, err := lib.InitializeClient()
	if err != nil {
		log.Fatal(err)
	}
	//departments,_:=cl.GetAllDepartments("WI26")
	//for _,d:=range departments{
	//	fmt.Printf("%s : %s\n",d.Code,d.Expansion)
	//}
	sr := lib.NewSearchRequest("WI26", "tabs-sub")
	sr.AddDepartment("AIP ")
	res, err := cl.GetCourseList(sr)
	if err != nil {
		log.Fatal(err)
	}
	b, _ := io.ReadAll(res)
	fmt.Println(string(b))
}
