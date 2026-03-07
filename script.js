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
const headerAliases = {
    "Invoice Number": "Original Invoice No"
};
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
        const currentHeaders = selectedIndexes.map(i => {

    let header = rows[0][i] || "";

    if (headerAliases[header]) {
        header = headerAliases[header];
    }

    return header;
});

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
