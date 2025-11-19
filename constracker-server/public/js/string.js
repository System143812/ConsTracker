export function formatString(text) {
    return text
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, char => char.toUpperCase());
}

export function dateFormatting(fullDateTime, options) {
    if(options === "time") {
        const dateObj = new Date(fullDateTime);
        const timeOnly = dateObj.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        return timeOnly;
    } else if(options === "date") {
        const dateObj = new Date(fullDateTime);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        return formattedDate;
    } else if(options === "dateTime") {
        const dateObj = new Date(fullDateTime);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const formattedTime = dateObj.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        const formattedDateTime = `${formattedDate} - ${formattedTime}`;
        return formattedDateTime;
    } else {
        return console.log("Invalid Request"); 
    }
}