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

function table_get_column(table, column_name) {
    var i = table.headers.indexOf(column_name);
    return table.rows.map(function(row) {return row[i]});
}

function table_get_column_date(table, column_name) {
    return table_get_column(table, column_name).map(function(x){return new Date(x)});
}

function table_get_column_int(table, column_name) {
    return table_get_column(table, column_name).map(parseInt);
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

function add_data_series(name, data_x, data_y){
    var points = data_x.map(function(x, i) {return {"x": x, "y": data_y[i]}});
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
            var table = table_filter(data['regioni'], 'denominazione_regione', region);

            var data_x = table_get_column_date(table, "data");
            var data_y = table_get_column_int(table, column);
            add_data_series(column + " " + region, data_x, data_y);
            chart.render();
        });
    });
    }
);   