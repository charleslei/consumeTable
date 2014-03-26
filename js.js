jQuery.fn.consumeTable = function(globalConfig) {

    function parseTable(cfg) {
        var me = this;
        var config = {
            error: function(){},
            success: function(){}
        }
        $.extend(config, cfg);
        me.config = config;
        me._container = cfg.self;
        me._initEditor();
    };

    parseTable.prototype = {
        _activEditMode : function() {
            this._container.find('.richtextarea-content').attr('designMode', 'On').attr('contentEditable', true);
        },

        _deActivEditMode : function() {
            this._container.find('.richtextarea-content').attr('designMode', 'off').attr('contentEditable', false);
        },

        _initEditor : function() {
            var temp =  ['<div class="richtextarea-content" style="width:100%;height:100%">',
                                '</div>',
                                '<div class="richtextarea-table-ctn" style="width:100%;height:100%">',
                                    '<table class="table table-bordered richtextarea-table">',
                                        '<thead class="richtextarea-table thead">',
                                        '</thead>',
                                        '<tbody class="richtextarea-table tbody">',
                                        '</tbody>',
                                    '</table>',
                                    '<div class="richtextarea-table-ctn-em">点击这里，进行编辑或粘帖</div>',
                                '</div>'];

            this._container.html($(temp.join('')));
            this._bindEvent();
            this._activEditMode();
        },

        _bindEvent: function(){
            var me = this;
            me._container.delegate('.richtextarea-content', 'mouseleave', function(e){
                me._preParse();
                $(this).hide();
                me._container.find('.richtextarea-table-ctn').show();
                e.preventDefault();
            }).delegate('.richtextarea-table-ctn', 'click', function(e){
                me._container.find('.richtextarea-content').show();
                $(this).hide();
                e.preventDefault();
            }).delegate('.richtextarea-table-ctn', 'mouseover', function(e){
                //me._container.find('.richtextarea-table-ctn-em').show();
            }).delegate('.richtextarea-table-ctn', 'mouseleave', function(e){
                //me._container.find('.richtextarea-table-ctn-em').hide();
            });
        },

        _preParse : function() {
            var me = this, errorMsg;
            var maxRowCount = me._revertTable();
            me._mergeRow(maxRowCount);

            var values = me._container.find('.richtextarea-content table tr');
            if (values.length < 3) {
                errorMsg = '数据不得少于 3 行';
                me._parseError(errorMsg);
                return;
            }

            // 合并行
            var nodes = $(values[0]).children(),
                rows = [],
                colHeaders = [];

            if (nodes.length > 1) {
                for (var j = 0, len2 = nodes.length; j < len2; j++) {
                    if ($(nodes[j]).text().replace(/(^\s*)|(\s*$)/g, "") != '') {
                        colHeaders.push(j);
                    }
                }
            } else {
                errorMsg  = '数据不得少于 2 列';
                me._parseError(errorMsg);
                return;
            }

            for (var i = 0, len = values.length; i < len; i++) {
                cols = [];
                var text = $(values[i]).text();
                text = text ? text.replace(/(^\s*)|(\s*$)/g, "") : text;

                if (text == null || text == '') continue;

                var nodes = $(values[i]).children();
                subRowCount = nodes.length;
                //每行比标题行的列数多的列，略过
                for (var j = 0, len1 = colHeaders.length; j < len1; j++) {
                    var temp = $(nodes[colHeaders[j]]).text().replace(/(^\s*)|(\s*$)/g, "");
                    cols.push(temp);
                }
                rows.push(cols);
            }
            rows = this._mergeSameCols(rows);
            me._parseSuccess(rows);
        },

        _mergeSameCols : function(data) {
            var firstR = data[0],
                tempObj = {}, colUnique = [],
                sameColCount = 1;
            //获取相同的列及其出现的次数
            var i = 0,
                len = firstR.length;
            for (; i < len; i++) {
                if (typeof tempObj[firstR[i]] == 'undefined') {
                    tempObj[firstR[i]] = [i];
                    colUnique.push(firstR[i]);
                } else {
                    tempObj[firstR[i]].push(i);
                }
            }

            //判断相同的列，数量是否相同
            var hasSameCols = 1,
                firstProp;
            for (var item in tempObj) {
                if (tempObj.hasOwnProperty(item)) {
                    firstProp = firstProp || item;
                    sameColCount = tempObj[firstProp].length;
                    hasSameCols &= sameColCount == tempObj[item].length ? true : false;
                }
            }

            //如果相同，进行列的拆分
            if (hasSameCols) {
                var newData = [],
                    i = 0,
                    len = data.length,
                    len1 = colUnique.length;
                for (; i < len; i++) {
                    var k = 0;
                    for (; k < sameColCount; k++) {
                        if (i == 0 && k < sameColCount - 1) continue;
                        var row = [],
                            j = 0;
                        for (; j < len1; j++) {
                            row.push(data[i][tempObj[colUnique[j]][k]]);
                        }
                        //略过空行
                        if (row.join('') != '')
                            newData.push(row);
                    }
                }
                data = newData;
            }
            return data;
        },

        _mergeRow : function(count) {
            var tds = $('.richtextarea-content tr');
            if (count < 2) return;
            $('td', tds[0]).each(function(tdindex, tditem) {
                var i = count - 1,
                    parent = $($(tditem).parent('tr')[0]),
                    finalText = '',
                    firstRow = true;
                while (i--) {
                    var currentText = $(parent.children('td')[tdindex]).text(),
                        nextText = $(parent.next().children('td')[tdindex]).text();
                    if (firstRow) {
                        finalText = currentText;
                        firstRow = false;
                    }
                    if (currentText !== nextText) {
                        finalText += '-' + nextText;
                    }
                    var preparent = parent;
                    parent = parent.next();
                }
                $(tditem).text(finalText);
            });
            $(tds).each(function(tdindex, tditem) {
                if (tdindex > 0 && tdindex < count) {
                    $(tditem).remove();
                } else if (tdindex > count) {
                    return false;
                }
            })
        },

        _revertTable : function() {
            var content = $(this);
            var maxRowspanCount = 0,
                firstRow = true;
            $("tr", content).each(function(trindex, tritem) {
                var cols = 0;
                $(tritem).find("td").each(function(tdindex, tditem) {
                    var rowspanCount = $(tditem).attr("rowspan"),
                        colspanCount = $(tditem).attr("colspan"),
                        value = $(tditem).text(),
                        newtd = "<td>" + value + "</td>";
                    maxRowspanCount = trindex == 0 && (+maxRowspanCount) < (+rowspanCount) ? +rowspanCount : +maxRowspanCount;
                    if (rowspanCount > 1) {
                        var parent = $(tditem).parent("tr")[0];
                        while (rowspanCount-- > 1) {
                            $(newtd).insertBefore($($(parent).next().children()[tdindex + cols]));
                            parent = $(parent).next();
                        }
                        $(tditem).attr("rowspan", 1);
                    }
                    if (colspanCount > 1) {
                        cols += colspanCount - 1;
                        while (colspanCount-- > 1) {
                            $(tditem).after(newtd);
                        }
                        $(tditem).attr("colspan", 1);
                    }
                });
            });
            return maxRowspanCount;
        },

        _parseError: function(msg){
            var me = this;
            me.config.error(msg);
        },

        _parseSuccess: function(rows) {
            var me = this;
            var h = this._container.find('.richtextarea-table-ctn table thead').empty();
            var b = this._container.find('.richtextarea-table-ctn table tbody').empty();
            for (var len=rows.length, i=0; i < len; i++) {
                var str = '<tr>', j = 0, len2 = rows[i].length;
                for (; j < len2; j++) {
                    str += '<td>' + rows[i][j] + '</td>';
                }
                str += '</tr>';
                if (i == 0) {
                    h.append(str);
                } else {
                    b.append(str);
                }
            }

            me.config.success(rows);
        },

        HtmlEncode : function(text) {
            text = new String(text);

            text = text.replace(/&/g, "&amp;");
            text = text.replace(/"/g, "&quot;");
            text = text.replace(/</g, "&lt;");
            text = text.replace(/>/g, "&gt;");
            text = text.replace(/\'/g, '&#39;'); // 39 27
            return text;
        },

        HtmlDecode : function(text) {
            text = new String(text);

            text = text.replace(/&quot;/g, '"');
            text = text.replace(/&amp;/g, '&');
            text = text.replace(/&#39;/g, "'");
            text = text.replace(/&lt;/g, '<');
            text = text.replace(/&gt;/g, '>');
            return text;
        }
    }

    //初始化；
    globalConfig = globalConfig || {};
    this.each(function(k, v){
        var me = $(v), sign = 'CONSUMETABLE';
        $.extend(globalConfig, {self: me});
        me.data(sign, new parseTable(globalConfig));
    })

}

!function(){
  var consumeTable = $("#data_area").consumeTable({
    error: function(e){
        //alert('e');
    },
    success: function(e){
        //alert(e);
    }
 });
}();