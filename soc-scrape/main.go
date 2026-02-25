package main

import (
	"encoding/json"
	"log"
	"os"
	"soc-scrape/lib"
	"soc-scrape/lib/courses"
	"strings"
	"sync"
	"time"
)

const TERM_CODE = "SP26"

var cl *lib.Client

func main() {
	// url: https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesPreReq.htm?termCode=<TERM_CODE>&courseId=<COURSE_ID>
	log.Println("Initializing Client")
	var err error
	cl, err = lib.InitializeClient()
	if err != nil {
		log.Fatal(err)
	}

	final_classes := make([]courses.CourseWritable, 0)
	departments, _ := cl.GetAllDepartments(TERM_CODE)

	rw := sync.RWMutex{}   // on the slice of all classes
	wg := sync.WaitGroup{} // on each coroutine

	for i, d := range departments {
		log.Printf("Making Search Request for Department %s (%d/%d)", d.Code, i+1, len(departments))
		sr := lib.NewSearchRequest(TERM_CODE, lib.TabDept)
		sr.AddDepartment(d.Code)
		res, err := cl.GetCourseList(sr)
		if err != nil {
			log.Fatal(err)
		}
		wg.Go(func() {
			getPreReqForDept(res, &rw, &final_classes)
			log.Printf("Collected pre-requisites for department %s", d.Code)
		})

	}
	wg.Wait()
	data, _ := json.MarshalIndent(final_classes, "", "    ")
	f, _ := os.Create("SOC_list.json")
	f.Write(data)

}

func getPreReqForDept(res []courses.Course, rw *sync.RWMutex, f *[]courses.CourseWritable) {
	appendable:=make([]courses.CourseWritable,0)
	for _, v := range res {
		fixed_code := strings.ReplaceAll(v.Code, " ", "")
		res, err := cl.GetPrerequisites(TERM_CODE, fixed_code)
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
		appendable = append(appendable, writable)
	}
		rw.Lock()
		defer rw.Unlock()
		*f = append(*f, appendable...)
}
