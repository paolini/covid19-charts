// const REPOSITORY_URL = "..";
const REPOSITORY_URL = "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master";
var data = {};

var regioni = [];

function load_data(callback) {
    return fetch(REPOSITORY_URL + "/dati-regioni/dpc-covid19-ita-regioni.csv")
        .then(function(response) {
            response.text().then(function(body) {
                var rows = $.csv.toArrays(body);
                var headers = rows[0];
                var rows = rows.slice(1);
                data['regioni'] = { 
                    headers: headers,
                    rows: rows
                };
                regioni = [];
                var i = headers.indexOf("denominazione_regione");
                rows.forEach(function(row){
                    var regione = row[i];
                    if (!regioni.includes(regione)) regioni.push(regione);
                });                
                callback();
            });
        });
}

function table_filter(table, column, value) {
    var i = table.headers.indexOf(column);
    return {
        'headers': table.headers,
        'rows': table.rows.filter(function(row) {return row[i] == value;})
    };
}

function table_get_dateint(table, t_column, y_column) {
    var i = table.headers.indexOf(t_column);
    var j = table.headers.indexOf(y_column);
    return table.rows.map(function (row) {return {'x': new Date(row[i]), 'y': parseInt(row[j])}});
}

var chart;

var chart_cfg = {
    title: {
        text: "ITA Covid-19"
    },
    axisX: {
        valueFormatString: "DD MMM"
    },
    axisY2: {
        title: "persone",
    },
    toolTip: {
        shared: true
    },
    legend: {
        cursor: "pointer",
        verticalAlign: "top",
        horizontalAlign: "center",
        dockInsidePlotArea: true,
        itemclick: toggleDataSeries
    },
    data: []
};

function toggleDataSeries(e){
    if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
        e.dataSeries.visible = false;
    } else{
        e.dataSeries.visible = true;
    }
    chart.render();
}

function add_data_series(name, points){
    chart.options.data.push({
        type: "line",
        axisYType: "secondary",
        name: name,
        showInLegend: true,
        markerSize: 2,
        dataPoints: points
    });
    chart.render();
};

function process_data() {
    var table = data['regioni'];
    var column = "deceduti";
    var region = "Lombardia"
    var series = table_get_dateint(table_filter(table, 'denominazione_regione', region), "data", column);
    add_data_series(column + " " + region, series);
}

$(function () {
    chart = new CanvasJS.Chart("chartContainer", chart_cfg);
    chart.render();
    load_data(function(){
        var $region = $("select[name='denominazione_regione']");
        $region.find('option').remove();
        regioni.forEach(function(regione){
            $region.append("<option value='" + regione + "'>" + regione + "</option>");
        });
        var $column = $("select[name='column']");
        $("button[name='add']").click(function(){
            var region = $region.children("option:selected").val();
            var column = $column.children("option:selected").val();
            var table = data['regioni'];
            var series = table_get_dateint(table_filter(table, 'denominazione_regione', region), "data", column);
            add_data_series(column + " " + region, series);
            chart.render();
        });
    });
    }
);   