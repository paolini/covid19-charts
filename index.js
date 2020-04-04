$.datepicker.setDefaults({
    dateFormat: "yy-mm-dd"
});

var datasets = {
    'dpc_nazione': new DpcNazionaleDataset(),
    'dpc_regioni': new DpcRegioniDataset(),
    'dpc_province': new DpcProvinceDataset(),
    'hopkins_confirmed': new HopkinsConfirmedDataset(),
    'hopkins_deaths': new HopkinsDeathsDataset(),
    'hopkins_recoverd': new HopkinsRecoveredDataset()
}

var chart;
var replay = [];
const hash_prefix = "#options=";

function set_location_hash() {
    var options = {
        version: 1,
        datasets: replay,
        chart: chart.get_options() 
    }
    var hash = hash_prefix + encodeURIComponent(JSON.stringify(options));
    history.pushState(null, null, hash)
}

function get_location_hash() {
    var hash = window.location.hash;
    if (hash.substring(0,hash_prefix.length) !== hash_prefix) return;
    hash = hash.substring(hash_prefix.length);
    var json = decodeURIComponent(hash);
    var options = JSON.parse(json);
    chart.set_options(options['chart'])
    options['datasets'].forEach(function(item) {
        for(var i=0;i<datasets.length;i++) {
            if (datasets[i].prefix === item.dataset) {
                datasets[i].add_series(item.options);
                break;
            }
        } 
    })
}

$(function () {
    chart = new ChartWrapper();

    Promise.all(Object.entries(datasets).map(function(pair){ return pair[1].run()}))
        .then(function() {
            get_location_hash();
            $("button[name='create_url']").click(set_location_hash);
        });

    var $data_source = $("select[name='data_source']");
    var data_source;
    var data_set = {};

    $data_source.change(function(){
        var val = $(this).val();
        $(".data_source").hide();
        $("#" + val + "_box").show();
        data_source = val;
    }).change();

    $(".dataset_select").change(function(){
        var val = $(this).val();
        var vals = val.split("_");
        $("." + vals[0]).hide();
        $("." + vals[0] + "." + vals[1]).show();
        data_set[vals[0]] = val;
    }).change();

    $("button[name='plot']").click(function(){
        datasets[data_set[data_source]].click();
    });

});   