
const token = '8437072888:AAFGnGpp5wBo-zA7DKp6nL4eTMUQGRd2LsY';

async function main() {
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}
main();
