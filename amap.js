// https://blog.csdn.net/xiasohuai/article/details/104426647

/**
 * GCJ02 转换为 WGS84
 * WGS84：为一种大地坐标系，也是目前广泛使用的GPS全球卫星定位系统使用的坐标系。
 * GCJ02：又称火星坐标系，是由中国国家测绘局制订的地理信息系统的坐标系统。由WGS84坐标系经加密后的坐标系。
 */
function gcj02towgs84(lng, lat) {
    //定义一些常量
    var x_PI = 3.14159265358979324 * 3000.0 / 180.0;
    var PI = 3.1415926535897932384626;
    var a = 6378245.0;
    var ee = 0.00669342162296594323;



    /**
     * 判断是否在国内，不在国内则不做偏移
     */
    function out_of_china(lng, lat) {
        return (lng < 72.004 || lng > 137.8347) || ((lat < 0.8293 || lat > 55.8271) || false);
    }

    function transformlat(lng, lat) {
        var ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
        ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(lat * PI) + 40.0 * Math.sin(lat / 3.0 * PI)) * 2.0 / 3.0;
        ret += (160.0 * Math.sin(lat / 12.0 * PI) + 320 * Math.sin(lat * PI / 30.0)) * 2.0 / 3.0;
        return ret
    }

    function transformlng(lng, lat) {
        var ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
        ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(lng * PI) + 40.0 * Math.sin(lng / 3.0 * PI)) * 2.0 / 3.0;
        ret += (150.0 * Math.sin(lng / 12.0 * PI) + 300.0 * Math.sin(lng / 30.0 * PI)) * 2.0 / 3.0;
        return ret
    }
    if (out_of_china(lng, lat)) {
        return [lng, lat]
    }
    else {
        var dlat = transformlat(lng - 105.0, lat - 35.0);
        var dlng = transformlng(lng - 105.0, lat - 35.0);
        var radlat = lat / 180.0 * PI;
        var magic = Math.sin(radlat);
        magic = 1 - ee * magic * magic;
        var sqrtmagic = Math.sqrt(magic);
        dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
        dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
        mglat = lat + dlat;
        mglng = lng + dlng;
        return [lng * 2 - mglng, lat * 2 - mglat]
    }
}

function getQueryVariable(query, variable) {
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    console.log('Query variable %s not found', variable);
}

function toLocation(str) {
    splits = str.split(",")
    var obj = new Object()
    obj.latitude = splits[0]
    obj.longtitude = splits[1]
    obj.name = splits[2]
    return obj
}

function parse() {
    separator = "__"
    queryString = decodeURI(document.URL).substring(document.URL.indexOf(separator) + separator.length)
    saddr = toLocation(getQueryVariable(queryString, "saddr"))
    daddr = toLocation(getQueryVariable(queryString, "daddr"))


    var jsonObj
    for (i in M.TS.d_ajax) {
        if (M.TS.d_ajax[i].__ajaxName.includes("navigation")) {
            jsonObj = JSON.parse(M.TS.d_ajax[i].response)
        }
    }
    var waypoints = []
    jsonObj.pathlist.forEach(pathList => pathList.locations.forEach(location => {
        location = gcj02towgs84(location[0], location[1])
        waypoints.push({"longtitude":location[0], "latitude":location[1]})}
    ))


    gpxContent = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n'
    gpxContent += '<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" creator="mapstogpx.com" version="1.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd">\n'
    //gpxContent += '<metadata>\n'
    //gpxContent += `    <link href="${document.URL}">\n`
    //gpxContent += `        <text>${window.title}</text>\n`
    //gpxContent += `    </link>\n`
    //gpxContent += '</metadata>\n'
    gpxContent += '<trk>\n'
    gpxContent += `<name>${daddr.name}_from_${saddr.name}</name>\n`
    gpxContent += '<trkseg>\n'
    waypoints.forEach(waypoint => gpxContent += `<trkpt lat="${waypoint.latitude}" lon="${waypoint.longtitude}"> </trkpt>\n`)
    gpxContent +=   '</trkseg>\n'
    gpxContent += '</trk>\n'
    gpxContent += '</gpx>\n'

    return {
        "name": `${daddr.name}_from_${saddr.name}.gpx`,
        "gpxContent": gpxContent
    }
}


function download() {
    var obj = parse()
    content = obj.gpxContent
    filename = obj.name
    contentType = 'application/octet-stream';
    var a = document.createElement('a');
    var blob = new Blob([content], {'type':contentType});
    a.href = window.URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

function setTaskerEnv() {
    setWifi(true)
/*    var obj = parse()*/
    /*var a = document.createElement('div');*/
    /*a.onclick = function() {*/
        /*document.body.innerHTML=""*/
        /*setWifi( false  )*/
        /*flash("successed")*/
        /*setLocal("hello", "world")*/
        /*setLocal("fileName", a.name)*/
        /*setLocal("gpxContent", a.gpxContent)*/
    /*}*/
    /*a.click()*/
    /*flash("out")*/
}
