let filesData = [];

// Configuration for different file types
const fileConfigs = [
    {
        nameMatch: "Converse Tally Cancel GST Report_",
        columns: [1,2,3,4,5,6,7,8,11,12,17,24,25,27,29,45,47,56,61]
    },
    {
        nameMatch: "Tally Return GST Report_",
        columns: [0,1,3,5,6,7,8,11,12,17,24,25,27,29,51,56,62,63,64]
    }
];

document.getElementById('fileInput').addEventListener('change', handleFiles);

function handleFiles(event) {
    const files = event.target.files;
    filesData = [];

    let promises = [];

    Array.from(files).forEach(file => {

        const config = fileConfigs.find(cfg =>
            file.name.toLowerCase().includes(cfg.nameMatch.toLowerCase())
        );

        if (config) {

            const reader = new FileReader();

            const promise = new Promise(resolve => {
                reader.onload = e => resolve({
                    content: e.target.result,
                    config: config
                });
            });

            reader.readAsText(file);
            promises.push(promise);

        } else {
            console.log("Ignored file:", file.name);
        }
    });

    if (promises.length === 0) {
        alert("No matching files found.");
        return;
    }

    Promise.all(promises).then(results => {
        filesData = results;
        compileCSV();
    });
}

function compileCSV() {

    let masterHeader = [];
    let compiledRows = [];

    filesData.forEach(fileObj => {

        const parsed = Papa.parse(fileObj.content, {
            skipEmptyLines: true
        });

        const rows = parsed.data;
        const selectedIndexes = fileObj.config.columns;

        // Extract header names for selected columns
        const currentHeaders = selectedIndexes.map(i => rows[0][i] || "");

        // Add new headers to masterHeader if not already present
        currentHeaders.forEach(header => {
            if (!masterHeader.includes(header)) {
                masterHeader.push(header);
            }
        });

        // Process data rows
        for (let r = 1; r < rows.length; r++) {

            let newRow = new Array(masterHeader.length).fill("");

            selectedIndexes.forEach((colIndex, idx) => {

                const headerName = currentHeaders[idx];
                const masterIndex = masterHeader.indexOf(headerName);

                if (masterIndex !== -1) {
                    newRow[masterIndex] = rows[r][colIndex] || "";
                }
            });

            compiledRows.push(newRow);
        }

    });

    // Convert to CSV
    const finalCSV =
        masterHeader.join(',') + '\n' +
        compiledRows.map(r => r.join(',')).join('\n');

    downloadCSV(finalCSV);
}
function downloadCSV(content) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = "compiled.csv";
    a.click();

    URL.revokeObjectURL(url);
}
/* FILE HISTORY */

let historyList = document.getElementById("fileHistory")

function addFileHistory(name){
let li=document.createElement("li")
li.textContent=name
historyList.appendChild(li)
}

/* SEARCH FILTER */

document.getElementById("searchBox").addEventListener("keyup",function(){

let value=this.value.toLowerCase()
let rows=document.querySelectorAll("#dataTable tbody tr")

rows.forEach(row=>{
row.style.display=row.innerText.toLowerCase().includes(value)?"":"none"
})

})

/* THEME TOGGLE */

function toggleTheme(){

if(document.body.style.background=="white"){
document.body.style.background="#050b1a"
document.body.style.color="white"
}
else{
document.body.style.background="white"
document.body.style.color="black"
}

}

/* EMAIL VALIDATOR */

function checkEmail(){

let email=prompt("Enter email")

let pattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/

if(pattern.test(email))
alert("Valid Email")

else
alert("Invalid Email")

}

/* WORDLIST GENERATOR */

function generateWordlist(){

let word=prompt("Enter keyword")

let list=[
word+"123",
word+"1234",
word+"@123",
word+"2025",
word+"admin"
]

alert(list.join("\n"))

}
