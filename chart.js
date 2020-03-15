var chart_config = {
    type: 'line',
    options: {
        title: {
            text: 'ITA covid-19'
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
                    labelString: 'numero'
                },
                type: 'linear'
            }]
        },
        plugins: {
            colorschemes: { // https://nagix.github.io/chartjs-plugin-colorschemes/
              scheme: 'tableau.Tableau10'
            }
      
        }
    }
};

var months = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];



class ChartWrapper {
    constructor() {
        var ctx = document.getElementById('canvas').getContext('2d');
        this.chart = new Chart(ctx, chart_config); 
        this.serieses = [];   
        var self = this;
        this.days_today = date_to_days(new Date());
        this.time_shift = false;

        this.$info = $("#chart_info");
        this.$clear = $("button[name='chart_clear']");
        this.$time_shift = $("select[name=time_shift]");
        
        this.$clear.click(function(){ 
            self.clear(); 
        });

        this.$time_shift.change(function(){
            self.time_shift = self.$time_shift.children("option:selected").val() === "on";
        })
    }

    add_series(series) {
        var label = series.label;
        var data_x = series.data_x;
        if (this.time_shift && this.serieses.length>0) {
            var offset =  series.offset - this.serieses[0].offset;
            data_x = data_x.map(function(x){return days_to_date(date_to_days(x) + offset)});
            if (offset > 0) {
                label += " +" + offset.toFixed(1) + " giorni";
            } else {
                label += " -" + (-offset).toFixed(1) + " giorni";
            }
        }

        var points = data_x.map(function(x, i) {return {"x": x, "y": series.data_y[i]}});
        this.chart.data.datasets.push({
            label: label,
            fill: false,
            data: points
        });
        this.serieses.push(series);
        this.chart.update();
        this.display_regression(series);
        if (this.serieses.length > 1) {
            this.$time_shift.prop("disabled", true);
        }
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
        this.chart.update();
        this.$info.find("li").remove();
        this.$time_shift.prop("disabled", false);
    }

    set_logarithmic(logarithmic) {
        this.chart.options.scales.yAxes[0].type = logarithmic ? 'logarithmic' : 'linear';
        this.chart.update();
    }
};
