export const urlBase = 'https://constracker.share.zrok.io';

export async function fetchData(url) {
    try {
        const response = await fetch(`${urlBase}${url}`, {
            headers: {
                "Accept":"application/json"
            },
            credentials: "include"
        });
        const data = await response.json();
        if(!data){
            alertPopup('error', 'Server Error');
            return 'error';
        } 
        if(data.status === 'invalid token' || data.status === 'missing token' || data.status === 'expired token') {
            window.location.href = urlBase;
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