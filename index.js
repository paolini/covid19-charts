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

function string_to_date(x) {return new Date(x)}

function string_to_int(x) {return parseInt(x)}

function date_to_days(x) {return x.getTime()/(1000.0*60*60*24)}

function table_get_column_date(table, column_name) {
    return table_get_column(table, column_name).map(string_to_date);
}

function table_get_column_int(table, column_name) {
    return table_get_column(table, column_name).map(string_to_int);
}

$(function () {
    chart_init();
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

            var data_x = table_get_column(table, "data").map(string_to_date);
            var data_y = table_get_column(table, column).map(string_to_int);
            add_data_series(column + " " + region, data_x, data_y);
            lr = linearRegression(data_y.map(Math.log), data_x.map(date_to_days));
            $("#info").append("<li>"+region+" "+column+": exponential R2="+lr.r2.toFixed(2)+" daily increase: "+((Math.exp(lr.m)-1)*100).toFixed(1)+"% (m="+lr.m+" q="+lr.q+")</li>")
            chart.render();
        });
    });
    }
);   