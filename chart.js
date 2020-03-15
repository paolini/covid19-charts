var chart_config = {
    type: 'line',
    options: {
        title: {
            text: 'covid-19'
        },
        scales: {
            xAxes: [{
                type: 'time',
                time: {
                    tooltipFormat: 'll HH:mm'
                },
                scaleLabel: {
                    display: true,
                    labelString: 'Data'
                },
                ticks: {
                        major: {
                            enabled: true,
                            fontStyle: 'bold'
                        },
                        source: 'data',
                        autoSkip: true,
                        autoSkipPadding: 75,
                        maxRotation: 0,
                        sampleSize: 100
                    },
                    afterBuildTicks: function(scale, ticks) {
                        var majorUnit = scale._majorUnit;
                        if (! ticks) return;
                        var firstTick = ticks[0];
                        var i, ilen, val, tick, currMajor, lastMajor;

                        val = moment(ticks[0].value);
                        if ((majorUnit === 'minute' && val.second() === 0)
                                || (majorUnit === 'hour' && val.minute() === 0)
                                || (majorUnit === 'day' && val.hour() === 9)
                                || (majorUnit === 'month' && val.date() <= 3 && val.isoWeekday() === 1)
                                || (majorUnit === 'year' && val.month() === 0)) {
                            firstTick.major = true;
                        } else {
                            firstTick.major = false;
                        }
                        lastMajor = val.get(majorUnit);

                        for (i = 1, ilen = ticks.length; i < ilen; i++) {
                            tick = ticks[i];
                            val = moment(tick.value);
                            currMajor = val.get(majorUnit);
                            tick.major = currMajor !== lastMajor;
                            lastMajor = currMajor;
                        }
                        return ticks;
                    }
            }],
            yAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: 'count'
                },
                ticks: {
                    beginAtZero: true,
                },
                type: 'linear',
                display: true,
                id: "count"
            },{
                scaleLabel: {
                    display: true,
                    labelString: '%'
                },
                ticks: {
                    beginAtZero: true,
                },
                type: 'linear',
                display: false,
                id: "rate"
            }
            ]
        },
        plugins: {
            colorschemes: { // https://nagix.github.io/chartjs-plugin-colorschemes/
              scheme: 'tableau.Tableau10'
            }
      
        }
    }
};

var months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];



class ChartWrapper {
    constructor() {
        var self = this;
        var ctx = document.getElementById('canvas').getContext('2d');
        this.chart = new Chart(ctx, chart_config); 
        this.serieses = [];   
        this.days_today = date_to_days(new Date());
        this.time_shift = false;
        this.rate_plot = false;
        this.no_update = false;

        this.$info = $("#chart_info");
        this.$clear = $("button[name='chart_clear']");
        this.$time_shift = $("select[name=time_shift]");
        this.$plot_type = $("select[name=chart_type]");
    
        this.$clear.click(function(){ 
            self.clear(); 
        });

        this.$time_shift.change(function(){
            self.time_shift = (self.$time_shift.children("option:selected").val() === "on");
            if (self.serieses.length>1) self.redraw();
        })

        this.$plot_type.change(function() {
            var val = self.$plot_type.children("option:selected").val();
            self.chart.options.scales.yAxes[0].type = (val=="log") ? 'logarithmic' : 'linear';
            self.rate_plot = (val=="rate");
            self.redraw();
        })
    }

    update() {
        if (!this.no_update) this.chart.update();
    }

    add_series(series) {
        var label = series.label;
        var data_x = series.data_x;
        if (this.time_shift && this.serieses.length>0) {
            var offset =  series.offset - this.serieses[0].offset;
            data_x = data_x.map(function(x){return days_to_date(date_to_days(x) + offset)});
            if (offset > 0) {this.rate_plot ? 1 : 0
                label += " +" + offset.toFixed(1) + " giorni";
            } else {
                label += " -" + (-offset).toFixed(1) + " giorni";
            }
        }

        var data_y = series.data_y;
        if (this.rate_plot) {
            data_x = data_x.slice(1);
            var data_y = new Array(data_x.length);
            for (var i=0; i < data_y.length;++i) {
                if (series.data_y[i]>0) {
                    data_y[i] = (series.data_y[i+1] / series.data_y[i] - 1.0) * 100.0; 
                } else {
                    data_y[i] = 0.0;
                }
            }
        }

        this.chart.options.scales.yAxes[0].display = !this.rate_plot;
        this.chart.options.scales.yAxes[1].display = this.rate_plot;

        var points = data_x.map(function(x, i) {return {"x": x, "y": data_y[i]}});
        this.chart.data.datasets.push({
            label: label,
            fill: false,
            yAxisID: (this.rate_plot ? "rate" : "count"),
            lineTension: 0,
            data: points
        });
        this.serieses.push(series);
        this.update();
        this.display_regression(series);
    };

    display_regression(series) {
        var name = series.label;
        var lr = series.lr;
        var days_passed = series.offset + this.days_today;
        var first_day = new Date((this.days_today-days_passed)*1000.0*60*60*24);
        this.$info.append(
            "<li> "+name+": " 
            + "fit esponenziale: R<sup>2</sup>=<b>"+lr.r2.toFixed(2)+"</b>, "
            + "aumento giornaliero: <b>"+((Math.exp(lr.m)-1)*100).toFixed(1)+"%</b>, "
            + "raddoppio in: <b>"+ (Math.log(2.0)/lr.m).toFixed(1) +"</b> giorni, "
            + "inizio <b>" + days_passed.toFixed(1) + "</b> giorni fa: "
            + "<b>" + first_day.getDate() + " " + months[first_day.getMonth()]+ " " + first_day.getFullYear() + "</b>"
            + "<!-- m="+lr.m+" "
            + "q="+lr.q+" --></li>"
            );
    }
    
    clear() {
        this.chart.data.datasets = [];
        this.serieses = [];
        this.update();
        this.$info.find("li").remove();
    }

    redraw() {
        var self = this;
        var serieses = this.serieses; // backup
        var no_update_backup = this.no_update;
        this.no_update = true;
        this.clear();
        serieses.forEach(function (series){
            self.add_series(series);
        })
        this.no_update = no_update_backup;
        this.update();
    }
};
