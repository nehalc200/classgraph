from pathlib import Path

import httpx
from bs4 import BeautifulSoup
import pandas as pd

BLANK_URL = "https://catalog.ucsd.edu/courses/{}.html"
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/144.0.0.0 Safari/537.36"
    )
}

def read_subject_codes(path):
    path = Path(path)
    with path.open() as f:
        return [line.strip() for line in f if line.strip()]


def scrape_courses(subject_codes, blank_url=BLANK_URL, headers=DEFAULT_HEADERS):
    all_data = []
    for code in subject_codes:
        response_html = fetch_html(code, blank_url=blank_url, headers=headers)
        soup = BeautifulSoup(response_html, "html.parser")

        course_names = soup.find_all(class_="course-name")
        course_desc = extract_descriptions(course_names)

        codes = [name.get_text(strip=True).split(".")[0] for name in course_names]
        titles = [
            name.get_text(strip=True).split(".")[1].split(" (")[0].strip()
            if len(name.get_text(strip=True).split(".")) > 1 else ""
            for name in course_names
        ]
        course_prereq = parse_prereqs(course_desc)

        for i in range(len(codes)):
#            print(f"Processing {codes[i]}...")
            if not titles[i]:
                continue
            all_data.append({
                "Subject": code,
                "Code": codes[i],
                "Title": titles[i],
                "Prerequisites": course_prereq[i],
            })
    return all_data


def build_courses_dataframe(subject_codes, blank_url=BLANK_URL, headers=DEFAULT_HEADERS):
    all_data = scrape_courses(subject_codes, blank_url=blank_url, headers=headers)
    return pd.DataFrame(all_data)


def save_courses_csv(df, path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    print(f"Saved {path}")

def fetch_html(code, blank_url=BLANK_URL, headers=DEFAULT_HEADERS):
    url = blank_url.format(code)
    response = httpx.get(url, headers=headers)
    return response.text

def extract_descriptions(course_names):
    descriptions = []
    for name in course_names:
        desc = "No description available"
        sibling = name.find_next_sibling()
        while sibling:
            if 'course-descriptions' in sibling.get('class', []):
                desc = sibling.get_text(strip=True)
                break
            if 'course-name' in sibling.get('class', []):
                break
            sibling = sibling.find_next_sibling()
        descriptions.append(desc)
    return descriptions

def parse_prereqs(descriptions):
    course_prereqs = []
    for description in descriptions:
        if 'Prerequisites:' in description:
            prereq_section = description.split('Prerequisites:')[1]
            found_prereqs = prereq_section.split('.')[0].strip()
        else:
            found_prereqs = "N/A"
        course_prereqs.append(found_prereqs)
    return course_prereqs

if __name__ == '__main__':
    subject_codes = read_subject_codes("valid_codes.txt")
    df = build_courses_dataframe(subject_codes)
    save_courses_csv(df, "data/all_courses.csv")
