
const majors = Array.from(document.querySelectorAll('table tr')).map(row => {
    const cells = Array.from(row.querySelectorAll('td'));

    // 1. Find the cell containing the Major Code (e.g., "MA29", "VA26")
    //    Pattern: Starts with 2 uppercase letters, ends with 2 digits.
    const codeIndex = cells.findIndex(td => /^[A-Z]{2}\d{2}$/.test(td.innerText.trim()));

    if (codeIndex !== -1) {
        return {
            code: cells[codeIndex].innerText.trim(),
            // The Major Name is always in the cell immediately following the code
            name: cells[codeIndex + 1]?.innerText.trim()
        };
    }
    return null;
}).filter(item => item !== null); // Remove empty/header rows

console.log(JSON.stringify(majors, null, 2));