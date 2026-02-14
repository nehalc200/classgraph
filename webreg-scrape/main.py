from pathlib import Path
import argparse

from course_scraper import read_subject_codes, build_courses_dataframe, save_courses_csv

from json_parser import load_courses_csv, generate_webreg_json


def run(codes_path, courses_csv_path, webreg_json_path, skip_scrape=False):
    if not skip_scrape:
        subject_codes = read_subject_codes(codes_path)
        df = build_courses_dataframe(subject_codes)
        save_courses_csv(df, courses_csv_path)
    else:
        print("Skipping scrape step.")

    df = load_courses_csv(courses_csv_path)
    generate_webreg_json(df, webreg_json_path)
    print(f"Saved {webreg_json_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Scrape UCSD course catalog and build webreg JSON."
    )
    
    parser.add_argument(
        "--skip-scrape",
        action="store_true",
        help="Skip scraping and only regenerate JSON from existing CSV.",
    )
    args = parser.parse_args()

    run(
        codes_path=Path('script/valid_codes.txt'),
        courses_csv_path=Path('data/all_courses.csv'),
        webreg_json_path=Path('data/webreg_data.json'),
        skip_scrape=args.skip_scrape,
    )


if __name__ == "__main__":
    main()
