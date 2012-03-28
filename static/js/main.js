var app = {};

$(function () {
    var model = new models.NBack();
    var view = new views.NBack({el: $(".main"), model: model});
    model.newBlock();
    model.start();
});