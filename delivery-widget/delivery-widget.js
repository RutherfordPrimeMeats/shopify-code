/*eslint-env browser, jquery*/
(function() {
	// Only allow Tue/Thur/Sat delivery, and disable holidays here.
	var beforeShowDay = function(day) {
		var ymd = day.getFullYear() + '-' + (day.getMonth() + 1) + '-' + day.getDate();
		if ($.inArray(ymd, ['2016-12-24']) >= 0) {
			return [false, ''];
		}
		if ($.inArray(day.getDay(), [2, 4, 6]) >= 0) {
			return [true, ''];
		}
		return [false, ''];
	};

	// Install date picker.
	$('#datePicker').datepicker({
		minDate: +1,
		maxDate: '+2M',
		beforeShowDay: beforeShowDay
	});

	// Ensure delivery date is provided.
	$(function() {
		$('input[name="checkout"], input[name="goto_pp"], input[name="goto_gc"]').click(function() {
			if ($('#datePicker').val() === '') {
				alert('You must pick a delivery date');
			} else {
				$(this).submit();
			}
		});
	});
})();
