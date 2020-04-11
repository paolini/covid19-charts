
/*
  EVENTS DATA
*/

class LockdownDataset extends BaseDataset { 
    constructor(options) {
        super({
            name: "lockdown",
            path: 'lockdown_dates.csv'
            // path: "events.csv"
        });
        this.REPOSITORY_URL = './data/';
        // this.REPOSITORY_URL = 'https://covid19-lockdown-tracker.netlify.com/';
        this.filter_column = 'Country';
        this.label_column = 'Country';
        this.date_column = 'Start date';
        //        this.filter_column = 'country';
        //        this.date_column = 'date';
        this.can_be_filtered = false;
    }

    init_html() {
        super.init_html();
        this.$select = $("select[name='" + this.prefix + "_filter']");
    }

    populate_html() {
        var self = this;
        var values = this.table.get_column_distinct(this.filter_column);
        this.$select.empty();
        this.$select.append("<option value=''>all</option>");
        values.forEach(function(val) {
            self.$select.append("<option value='" + val + "'>" + val + "</option>");
        });
    }

    get_options() {
        var options = super.get_options();
        options.value = this.$select.children("option:selected").val();
        return options;
    }

    get_series(options) {
        var value = options.value;
        var subtable = this.table;
        var label = this.name;
        if (value) {
            subtable = subtable.filter(this.filter_column, value);
            label += " " + value;
        }
        var data_x = [];
        var data_y = [];
        var x_col = subtable.headers.indexOf(this.date_column);
        var y_col = subtable.headers.indexOf(this.label_column);
        subtable.rows.forEach(function(row) {
            data_x.push(string_to_date(row[x_col]));
            data_y.push(row[y_col]);
        })
        var series = new Series(data_x, data_y, label);
        series.y_axis = 'events';
        return series;
    }

}
