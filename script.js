let filesData = [];

// Configuration for different file types
const fileConfigs = [
    {
        nameMatch: "Converse Tally Cancel GST Report_",
        columns: [1,2,4,5,6,7,8,11,12,17,24,25,27,29,45,47,56,61]
    },
    {
        nameMatch: "Tally Return GST Report_",
        columns: [0,1,4,5,6,7,8,11,12,17,24,25,27,29,51,56,62,63,64]
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
    "Original Invoice No": "Invoice number",
    "Original Invoice": "Invoice number",
    "Dispatch Date/Cancellation Date": "Date",
    "Entity": "Return Type"
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

        const currentHeaders = selectedIndexes.map(i => {

            let header = rows[0][i] || "";

            if (headerAliases[header]) {
                header = headerAliases[header];
            }

            return header;
        });

        currentHeaders.forEach(header => {
            if (!masterHeader.includes(header)) {
                masterHeader.push(header);
            }
        });

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

    // Add Total Tax column
    if (!masterHeader.includes("Total Tax")) {
        masterHeader.push("Total Tax");
    }

    const igstIndex = masterHeader.indexOf("IGST");
    const cgstIndex = masterHeader.indexOf("CGST");
    const sgstIndex = masterHeader.indexOf("SGST");
    const totalTaxIndex = masterHeader.indexOf("Total Tax");

    compiledRows = compiledRows.map(row => {

        let igst = parseFloat(row[igstIndex]) || 0;
        let cgst = parseFloat(row[cgstIndex]) || 0;
        let sgst = parseFloat(row[sgstIndex]) || 0;

        // Step 1: Calculate Total Tax
        row[totalTaxIndex] = (igst + cgst + sgst).toFixed(2);

        // Step 2: Multiply selected columns by -1
        const columnsToFlip = [
            "Qty",
            "Unit Price",
            "Total Tax",
            "Total",
            "CGST",
            "IGST",
            "SGST"
        ];

        columnsToFlip.forEach(col => {

            const idx = masterHeader.indexOf(col);

            if (idx !== -1) {

                let value = parseFloat(row[idx]);

                if (!isNaN(value)) {
                    row[idx] = (value * -1).toFixed(2);
                }

            }

        });

        return row;
    });

    // Move Date column to first position
    const dateIndex = masterHeader.indexOf("Date");

    if (dateIndex > 0) {

        const dateHeader = masterHeader.splice(dateIndex,1)[0];
        masterHeader.unshift(dateHeader);

        compiledRows = compiledRows.map(row => {

            const dateValue = row.splice(dateIndex,1)[0];
            row.unshift(dateValue);

            return row;
        });
    }

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
