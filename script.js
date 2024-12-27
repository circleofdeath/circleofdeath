function read(file) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", `${file}`, false);
    xhr.send();

    if(xhr.status === 200) {
        return xhr.responseText;
    } else {
        console.error(`Failed to load ${file}`);
        return '';
    }
}