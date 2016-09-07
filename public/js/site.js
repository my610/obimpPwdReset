"use strict";

$(function () {

  $("#form-reset").submit(function (e) {
    var form = $(this);
    form.find("button :submit").prop("disabled", true);
    $.ajax({
      type: "post",
      url: form.attr("action"),
      data: form.serialize(),
      success: function (data) {
        if (data.code === 200) {
          form.hide();
          $("#success-info").html(data.statusText).show();
        } else {
          $('#resultBlock').addClass("text-danger").html(data.statusText).fadeIn(250).fadeOut(5000);
          grecaptcha.reset();
        }

      },
      error: function () {
        alert("Что-то пошло не так... =(");
      }
    }).always(function () {
        form.find("button :submit").prop("disabled", false);
      }
    );

    e.preventDefault();
  });

  $("#set-password").submit(function (e) {
    var form = $(this);
    form.find("button :submit").prop("disabled", true);
    $.ajax({
      type: "post",
      url: form.attr("action"),
      data: form.serialize(),
      success: function (data) {
        if (data.code === 200) {
          form.hide();
          $("#success-info").html(data.statusText).show();
        } else {
          $('#resultBlock').addClass("text-danger").html(data.statusText).fadeIn(250).fadeOut(5000);
          grecaptcha.reset();
        }

      },
      error: function () {
        alert("Что-то пошло не так... =(");
      }
    }).always(function () {
        form.find("button :submit").prop("disabled", false);
      }
    );

    e.preventDefault();
  });
});


