$.datepicker.setDefaults({
    dateFormat: "yy-mm-dd"
});

var datasets = [
    new DpcNazionaleDataset(),
    new DpcRegioniDataset(),
    new DpcProvinceDataset(),
    new HopkinsConfirmedDataset(),
    new HopkinsDeathsDataset(),
    new HopkinsRecoveredDataset()
]

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

    Promise.all(datasets.map(function(dataset){ return dataset.run()})).then(function() {
        get_location_hash();
        $("button[name='create_url']").click(set_location_hash);
    });

});   