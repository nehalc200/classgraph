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
						Code: currentFullCode,
						ID:   currentFullCode,
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

func parseClassRequirements(htmlcontent io.Reader) (*courses.PrereqNode, error) {
	doc, err := goquery.NewDocumentFromReader(htmlcontent)
	if err != nil {
		return nil, err
	}

	// The root node for this specific page is always an AND
	root := &courses.PrereqNode{
		Type:  "AND",
		Items: []*courses.PrereqNode{},
	}

	// Target the main prerequisite table rows
	doc.Find("table tr").Each(func(i int, s *goquery.Selection) {
		// Only look at rows that start with a number (1., 2., etc.)
		if s.Find("td").First().Text() != "" && strings.Contains(s.Find("td").First().Text(), ".") {

			requirementCell := s.Find("td").Eq(1)
			var rowItems []*courses.PrereqNode

			// Extract all bolded course codes within this row
			requirementCell.Find("span.bold_text").Each(func(j int, courseSpan *goquery.Selection) {
				courseCode := strings.TrimSpace(courseSpan.Text())
				if courseCode != "" {
					rowItems = append(rowItems, &courses.PrereqNode{
						Type:     "COURSE",
						CourseID: formatCourseCode(courseCode),
					})
				}
			})

			// Logic check: If there's an "or" span, wrap these in an OR node
			if requirementCell.Find("span.ertext").Text() == "or" {
				root.Items = append(root.Items, &courses.PrereqNode{
					Type:  "OR",
					Items: rowItems,
				})
			} else {
				// Otherwise, add them directly to the AND list
				root.Items = append(root.Items, rowItems...)
			}
		}
	})

	return root, nil
}

func formatCourseCode(unified string) string {
	clean := strings.ReplaceAll(unified, "-", "")
	re := regexp.MustCompile(`^([A-Z]{2,5})([0-9]{1,3}[A-Z]*)$`)
	matches := re.FindStringSubmatch(strings.TrimSpace(clean))
	if len(matches) == 3 {
		return matches[1] + " " + matches[2]
	}
	return unified 
}
