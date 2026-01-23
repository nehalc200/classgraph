package lib

import (
	"fmt"
	"io"
	"regexp"
	"soc-scrape/lib/courses"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

/*
This can parse multiple course codes from different departments at once.
However, it cannot scrape section, instructor, and other bits of data.
*/
func parseSearchResults(htmlcontent io.Reader) ([]courses.Course, error) {
	doc, err := goquery.NewDocumentFromReader(htmlcontent)
	if err != nil {
		return nil, err
	}
	courseMap := make(map[string]courses.Course)
	var currentDept string
	var currentFullCode string
	deptRegex := regexp.MustCompile(`\((.*?)\)`)

	doc.Find("table.tbrdr tr, h2").Each(func(i int, s *goquery.Selection) {

		if s.Is("h2") {
			matches := deptRegex.FindStringSubmatch(s.Text())
			if len(matches) > 1 {
				currentDept = strings.TrimSpace(matches[1])
			}
			return
		}

		if s.Find("td.crsheader").Length() > 0 && !s.HasClass("sectxt") {
			rawNum := strings.TrimSpace(s.Find("td.crsheader").Eq(1).Text())
			//title := strings.TrimSpace(s.Find("td.crsheader").Eq(2).Text())

			if rawNum != "" && currentDept != "" {
				currentFullCode = fmt.Sprintf("%s %s", currentDept, rawNum)

				if _, exists := courseMap[currentFullCode]; !exists {
					courseMap[currentFullCode] = courses.Course{
						Department: currentDept,
						Numerical:  rawNum,
					}
				}
			}
		}
	})

	var result []courses.Course
	for _, v := range courseMap {
		result = append(result, v)
	}
	return result, nil
}
