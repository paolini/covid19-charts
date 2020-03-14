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

var datasets = [
    {
        name: "italia",
        path: "/dati-andamento-nazionale/dpc-covid19-ita-andamento-nazionale.csv",
        label: function(column, value) {return "Italia " + dash_to_space(column);}
    },
    {
        name: "regioni",
        path: "/dati-regioni/dpc-covid19-ita-regioni.csv",
        filter_column: "denominazione_regione",
        label: function(column, value) {return value + " " + dash_to_space(column);}
    }
];

$(function () {
    chart_init();

    datasets.forEach(function(dataset){
        fetch_data(dataset.path).then(function(table){
            var $column = $("select[name='" + dataset.name + "_column']");
            var $select = dataset.filter_column ? $("select[name='" + dataset.name + "_" + dataset.filter_column) : null;
            var $button = $("button[name='" + dataset.name + "_add']");
    
            if (dataset.filter_column) {
                var values = table_get_column_distinct(table, dataset.filter_column);
                $select.find('option').remove();
                values.forEach(function(value){
                    $select.append("<option value='" + value + "'>" + value + "</option>");
                });
            }
            
            $column.find('option').remove();
            fields.forEach(function(field){
                $column.append("<option value='" + field + "'>" + dash_to_space(field) + "</option>");
            });
    
            $button.click(function(){
                var column = $column.children("option:selected").val();
                var subtable = table;
                var value = null;
                if (dataset.filter_column) {
                    value = $select.children("option:selected").val();
                    var subtable = table_filter(table, dataset.filter_column, value);
                }
    
                var data_x = table_get_column(subtable, "data").map(string_to_date);
                var data_y = table_get_column(subtable, column).map(string_to_int);
                var name = dataset.label(column, value);
                chart_add_series(name, data_x, data_y);
                compute_regression(name, data_y, data_x);
                chart.render();
            });
        });    
    });
});   