// const REPOSITORY_URL = "..";

var common_fields = ["ricoverati_con_sintomi", "terapia_intensiva", "totale_ospedalizzati", "isolamento_domiciliare", 
    "totale_attualmente_positivi", "nuovi_attualmente_positivi", "dimessi_guariti", "deceduti", "totale_casi", "tamponi"];

var today = new Date();
var days_today = date_to_days(today);

function fetch_data(path) {
    const REPOSITORY_URL = "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/";
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

function fetch_data_hopkins(path) {
    const REPOSITORY_URL = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/";
    return new Promise(function(resolve,reject) {
        fetch(REPOSITORY_URL + path)
        .then(function(response) {
            response.text().then(function(body) {
                var rows = $.csv.toArrays(body);
                const first_date_column = 4;
                var name = path.split('-').slice(-1)[0].split('.')[0];
                var headers = rows[0].slice(0,first_date_column).concat(['data', name]);
                var dates = rows[0].slice(first_date_column);
                var rows = rows.slice(1);
                var full_rows = [];
                rows.forEach(function(row){
                    for (i=first_date_column;i<row.length;++i) {
                        var found = full_rows.length;
                        full_rows.push(row.slice(0,first_date_column).concat([dates[i-first_date_column], parseInt(row[i])]));
                    }
                });
                var table = { 
                    headers: headers,
                    rows: full_rows
                };
                return resolve(table);
            });
        })
    });
}

var months = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

function display_regression(name, lr) {
    var days_passed = ((lr.q/lr.m) + days_today);
    var first_day = new Date((days_today-days_passed)*1000.0*60*60*24);
    $("#info").append(
        "<li> "+name+": " 
        + "fit esponenziale: R2=<b>"+lr.r2.toFixed(2)+"</b>, "
        + "aumento giornaliero: <b>"+((Math.exp(lr.m)-1)*100).toFixed(1)+"%</b>, "
        + "raddoppio in: <b>"+ (Math.log(2.0)/lr.m).toFixed(1) +"</b> giorni, "
        + "inizio <b>" + days_passed.toFixed(1) + "</b> giorni fa: "
        + "<b>" + first_day.getDate() + " " + months[first_day.getMonth()]+ " " + first_day.getFullYear() + "</b>"
        + "<!-- m="+lr.m+" "
        + "q="+lr.q+" --></li>"
        );
}

var datasets = [
    new DpcDataset({
        name: "italia",
        path: "dati-andamento-nazionale/dpc-covid19-ita-andamento-nazionale.csv",
        fields: common_fields,
        label: function(column, value) {return "Italia " + dash_to_space(column);}
    }),
    new DpcDataset({
        name: "regioni",
        fetch_hook: fetch_data,
        path: "dati-regioni/dpc-covid19-ita-regioni.csv",
        fields: common_fields,
        filter_name_column: "denominazione_regione",
        filter_column: "codice_regione"
    }),
    new DpcDataset({
        name: "province",
        fetch_hook: fetch_data,
        path: "dati-province/dpc-covid19-ita-province.csv",
        fields: ['totale_casi'],
        filter_name_column: "denominazione_provincia",
        filter_column: "codice_provincia",
        table_adjust_hook: function(table) {
            //    var j = table.headers.indexOf("codice_provincia");
            var k = table.headers.indexOf("denominazione_provincia");
            var h = table.headers.indexOf("denominazione_regione");
            table.rows.forEach(function(row){
                row[k] = row[h]+": "+row[k];
            });
            return table;
        }
    })
    /*,
    {
        name: "countries",
        request_load: true,
        fetch_hook: fetch_data_hopkins,
        path: "csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv",
        fields: ['Confirmed'],
        filter_name_column: "Country/Region",
        filter_column: "Country/Region",
        subfilter_name_column: "Province/State",
        subfilter_column: "Province/State"
    },*/
]

var first_series_offset = null;

$(function () {
    chart_init();

    datasets.forEach(function(dataset){
        dataset.init_html();        
        
        dataset.load().then(function() {
            dataset.populate_html();            
            console.log("finished fetching dataset " + dataset.prefix);
        });    
    });

    $("select[name='chart_scale']").change(function(){
        var val = $(this).children("option:selected").val();
        chart.options.scales.yAxes[0].type = val==='log' ? 'logarithmic' : 'linear';
        chart.update();
    });
});   