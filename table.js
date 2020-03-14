function table_filter(table, column, value) {
    var i = table.headers.indexOf(column);
    return {
        'headers': table.headers,
        'rows': table.rows.filter(function(row) {return row[i] == value;})
    };
}

function table_get_column(table, column_name) {
    var i = table.headers.indexOf(column_name);
    return table.rows.map(function(row) {return row[i]});
}

function table_get_column_distinct(table, column_name) {
    var values = [];
    table_get_column(table, column_name).forEach(function(x){
        if (!values.includes(x)) values.push(x);
    })
    return values;
}

function table_get_column_pairs(table, col1, col2) {
    var i = table.headers.indexOf(col1);
    var j = table.headers.indexOf(col2);
    return table.rows.map(function(row) {return [row[i], row[j]] });
}

function table_get_column_distinct_pairs(table, id_name, value_name) {
    var values = [];
    table_get_column_pairs(table, id_name, value_name).forEach(function(pair){
        var i;
        for (i=0;i<values.length && values[i][0]!=pair[0];++i){}
        if (i>=values.length) {
            values.push(pair);
        }
    });
    return values;
}

function string_to_date(x) {return new Date(x)}

function string_to_int(x) {return parseInt(x)}

function date_to_days(x) {return x.getTime()/(1000.0*60*60*24)}

function dash_to_space(x) {return x.replace(/_/g," ")}
