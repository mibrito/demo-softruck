/*
 * Function that format dates as DD MM YYYY or YYYY MM DD with the desired sep 
 */
module.exports = function formattedDate(date, sep, type) {
	var d = new Date(date || Date.now()),
	month = '' + (d.getMonth() + 1),
	day = '' + d.getDate(),
	year = d.getFullYear();

	if (month.length < 2) month = '0' + month;
	if (day.length < 2) day = '0' + day;

	if(!type)return [month, day, year].join(sep);
	if(type)return [year, day, month].join(sep);
}