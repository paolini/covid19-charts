// const REPOSITORY_URL = "..";

var common_fields = ["ricoverati_con_sintomi", "terapia_intensiva", "totale_ospedalizzati", "isolamento_domiciliare", 
    "totale_attualmente_positivi", "nuovi_attualmente_positivi", "dimessi_guariti", "deceduti", "totale_casi", "tamponi"];

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

var datasets = [
    new DpcNazionaleDataset(),
    new DpcRegioniDataset(),
    new DpcProvinceDataset()
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

var chart;

$(function () {
    chart = new ChartWrapper();

    $("select[name='chart_scale']").change(function(){
        var val = $(this).children("option:selected").val();
        chart.set_logarithmic(val==='log');
    });

    datasets.forEach(function(dataset){
        dataset.init_html();        
        
        dataset.load().then(function() {
            dataset.populate_html();            
        });    
    });

});   