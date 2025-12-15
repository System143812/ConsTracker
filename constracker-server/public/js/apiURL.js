import { alertPopup } from "./popups.js";

export async function fetchData(url) { //baka malimutan!!!!! this won't handle empty arrays!!!! make sure to check the length after calling this. :>
    try {
        const response = await fetch(url, {
            headers: {
                "Accept":"application/json"
            },
            credentials: "include"
        });
        const data = await response.json();
        // console.log(data);
        if(!data){
            alertPopup('error', 'Server Error');
            return 'error';
        } 
        if(data.status === 'invalid token' || data.status === 'missing token' || data.status === 'expired token') {
            window.location.href = '/';
            alertPopup('error', 'Invalid/Expired Token');
            return 'error';
        }
        return data;
    } catch (error) {
        console.log(`Error occured: ${error}`);
        alertPopup('error', 'Network Connection Error');
        return 'error';
    }
}

//i-add soon here sa baba yung fetch call for post requests na may kasamang log notes for log activities