// const REPOSITORY_URL = "..";
const REPOSITORY_URL = "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master";

var common_fields = ["ricoverati_con_sintomi", "terapia_intensiva", "totale_ospedalizzati", "isolamento_domiciliare", 
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
        fields: common_fields,
        label: function(column, value) {return "Italia " + dash_to_space(column);}
    },
    {
        name: "regioni",
        path: "/dati-regioni/dpc-covid19-ita-regioni.csv",
        fields: common_fields,
        filter_name_column: "denominazione_regione",
        filter_column: "codice_regione"
    },
    {
        name: "province",
        path: "/dati-province/dpc-covid19-ita-province.csv",
        fields: ['totale_casi'],
        filter_name_column: "denominazione_provincia",
        filter_column: "codice_provincia",
        table_adjust_hook: function(table) {
            var j = table.headers.indexOf("codice_provincia");
            var k = table.headers.indexOf("denominazione_provincia");
            var h = table.headers.indexOf("denominazione_regione");
            table.rows.forEach(function(row){
                row[k] = utf8.decode(row[k]);
                if (row[j]>900) {
                    row[k] = row[h]+" "+row[k];
                }
            });
        }
    }
];

$(function () {
    chart_init();

    datasets.forEach(function(dataset){
        fetch_data(dataset.path).then(function(table){
            if (dataset.table_adjust_hook) {
                dataset.table_adjust_hook(table);
            }
            var $column = $("select[name='" + dataset.name + "_column']");
            var $select = dataset.filter_column ? $("select[name='" + dataset.name + "_" + dataset.filter_column) : null;
            var $button = $("button[name='" + dataset.name + "_add']");
    
            if (dataset.filter_column) {
                var pairs = table_get_column_distinct_pairs(table, dataset.filter_column, dataset.filter_name_column);
                pairs.sort(function(a,b){return a[1].localeCompare(b[1])});
                $select.find('option').remove();
                pairs.forEach(function(pair){
                     $select.append("<option value='" + pair[0] + "'>" + pair[1] + "</option>");
                });
            }
            
            $column.find('option').remove();
            dataset.fields.forEach(function(field){
                $column.append("<option value='" + field + "'>" + dash_to_space(field) + "</option>");
            });
    
            $button.click(function(){
                var column = $column.children("option:selected").val();
                var subtable = table;
                var value = null;
                if (dataset.filter_column) {
                    value = $select.children("option:selected").val();
                    value_name = $select.children("option:selected").text();
                    var subtable = table_filter(table, dataset.filter_column, value);
                }
    
                var data_x = table_get_column(subtable, "data").map(string_to_date);
                var data_y = table_get_column(subtable, column).map(string_to_int);
                var label = dataset.label || (function(column, value) {
                    return value + " " + dash_to_space(column);
                });
                var name = label(column, value_name);
                chart_add_series(name, data_x, data_y);
                compute_regression(name, data_y, data_x);
                chart.render();
            });
        });    
    });
});   