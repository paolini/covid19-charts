// const REPOSITORY_URL = "..";
const REPOSITORY_URL = "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master";
var data = {};
var regioni = [];

var fields = ["ricoverati_con_sintomi", "terapia_intensiva", "totale_ospedalizzati", "isolamento_domiciliare", 
    "totale_attualmente_positivi", "nuovi_attualmente_positivi", "dimessi_guariti", "deceduti", "totale_casi", "tamponi"];

function fetch_data(path) {
    return new Promise(function(resolve,reject) {
        fetch(REPOSITORY_URL + path)
        .then(function(response) {
            response.text().then(function(body) {
                var rows = $.csv.toArrays(body);
                var headers = rows[0];
                var rows = rows.slice(1);
                var table = { 
                    headers: headers,
                    rows: rows
                };
                return resolve(table);
            });
        })
    });
}

function load_data_regioni() {
    return new Promise(function(resolve,reject) {
        fetch_data("/dati-regioni/dpc-covid19-ita-regioni.csv")
            .then(function(table) {
                data['regioni'] = table;
                regioni = [];
                var i = table.headers.indexOf("denominazione_regione");
                table.rows.forEach(function(row){
                    var regione = row[i];
                    if (!regioni.includes(regione)) regioni.push(regione);
                });                
                resolve();
            });
        });
}

function load_data_nazionale() {
    return new Promise(function(resolve,reject){
        fetch_data("/dati-andamento-nazionale/dpc-covid19-ita-andamento-nazionale.csv")
        .then(function(table){
            data['nazionale'] = table;
            resolve();
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

function dash_to_space(x) {return x.replace(/_/g," ")}

function table_get_column_date(table, column_name) {
    return table_get_column(table, column_name).map(string_to_date);
}

function table_get_column_int(table, column_name) {
    return table_get_column(table, column_name).map(string_to_int);
}

$(function () {
    chart_init();

    load_data_nazionale().then(function(){
        var $column = $("select[name='national_column']");
        $column.find('option').remove();
        fields.forEach(function(field){
            $column.append("<option value='" + field + "'>" + dash_to_space(field) + "</option>");
        });

        $("button[name='national_add']").click(function(){
            var column = $column.children("option:selected").val();
            var table = data['nazionale'];

            var data_x = table_get_column(table, "data").map(string_to_date);
            var data_y = table_get_column(table, column).map(string_to_int);
            add_data_series(dash_to_space(column) + " italia", data_x, data_y);
            lr = linearRegression(data_y.map(Math.log), data_x.map(date_to_days));
            $("#info").append(
                "<li>Italia "+dash_to_space(column)+": " 
                + "fit esponenziale: R2=<b>"+lr.r2.toFixed(2)+"</b> "
                + "aumento giornaliero: <b>"+((Math.exp(lr.m)-1)*100).toFixed(1)+"%</b> "
                + "raddoppio in: <b>"+ (Math.log(2.0)/lr.m).toFixed(1)+"</b> giorni "
                + "(m="+lr.m+" "
                + "q="+lr.q+")</li>"
                );
            chart.render();
        });
    });

    load_data_regioni().then(function(){
        var $region = $("select[name='denominazione_regione']");
        $region.find('option').remove();
        regioni.forEach(function(regione){
            $region.append("<option value='" + regione + "'>" + regione + "</option>");
        });
        
        var $column = $("select[name='region_column']");
        $column.find('option').remove();
        fields.forEach(function(field){
            $column.append("<option value='" + field + "'>" + dash_to_space(field) + "</option>");
        });

        $("button[name='region_add']").click(function(){
            var region = $region.children("option:selected").val();
            var column = $column.children("option:selected").val();
            var table = table_filter(data['regioni'], 'denominazione_regione', region);

            var data_x = table_get_column(table, "data").map(string_to_date);
            var data_y = table_get_column(table, column).map(string_to_int);
            add_data_series(dash_to_space(column) + " " + region, data_x, data_y);
            lr = linearRegression(data_y.map(Math.log), data_x.map(date_to_days));
            $("#info").append(
                "<li>"+region+" "+dash_to_space(column)+": " 
                + "fit esponenziale: R2=<b>"+lr.r2.toFixed(2)+"</b> "
                + "aumento giornaliero: <b>"+((Math.exp(lr.m)-1)*100).toFixed(1)+"%</b> "
                + "raddoppio in: <b>"+ (Math.log(2.0)/lr.m).toFixed(1)+"</b> giorni "
                + "(m="+lr.m+" "
                + "q="+lr.q+")</li>"
                );
            chart.render();
        });
    });
    }
);   