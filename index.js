// const REPOSITORY_URL = "..";
const REPOSITORY_URL = "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master";

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

function compute_regression(name, data_y, data_x) {
    lr = linearRegression(data_y.map(Math.log), data_x.map(date_to_days));
    $("#info").append(
        "<li> "+name+": " 
        + "fit esponenziale: R2=<b>"+lr.r2.toFixed(2)+"</b> "
        + "aumento giornaliero: <b>"+((Math.exp(lr.m)-1)*100).toFixed(1)+"%</b> "
        + "raddoppio in: <b>"+ (Math.log(2.0)/lr.m).toFixed(1)+"</b> giorni "
        + "(m="+lr.m+" "
        + "q="+lr.q+")</li>"
        );
}

$(function () {
    chart_init();

    fetch_data("/dati-andamento-nazionale/dpc-covid19-ita-andamento-nazionale.csv").then(function(table){
        var $column = $("select[name='national_column']");
        $column.find('option').remove();
        fields.forEach(function(field){
            $column.append("<option value='" + field + "'>" + dash_to_space(field) + "</option>");
        });

        $("button[name='national_add']").click(function(){
            var column = $column.children("option:selected").val();

            var data_x = table_get_column(table, "data").map(string_to_date);
            var data_y = table_get_column(table, column).map(string_to_int);
            chart_add_series(dash_to_space(column) + " italia", data_x, data_y);
            compute_regression("Italia "+dash_to_space(column), data_y, data_x);
            chart.render();
        });
    });

    fetch_data("/dati-regioni/dpc-covid19-ita-regioni.csv").then(function(table){
        var regioni = table_get_column_distinct(table, "denominazione_regione");
        var $select = $("select[name='denominazione_regione']");
        $select.find('option').remove();
        regioni.forEach(function(regione){
            $select.append("<option value='" + regione + "'>" + regione + "</option>");
        });
        
        var $column = $("select[name='region_column']");
        $column.find('option').remove();
        fields.forEach(function(field){
            $column.append("<option value='" + field + "'>" + dash_to_space(field) + "</option>");
        });

        $("button[name='region_add']").click(function(){
            var region = $select.children("option:selected").val();
            var column = $column.children("option:selected").val();
            var subtable = table_filter(table, 'denominazione_regione', region);

            var data_x = table_get_column(subtable, "data").map(string_to_date);
            var data_y = table_get_column(subtable, column).map(string_to_int);
            chart_add_series(dash_to_space(column) + " " + region, data_x, data_y);
            compute_regression(region+" "+dash_to_space(column), data_y, data_x);
            chart.render();
        });
    });

});   