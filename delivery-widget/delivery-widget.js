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
	$('#deliveryDatePicker').datepicker({
		minDate: +1,
		maxDate: '+2M',
		beforeShowDay: beforeShowDay
	});
	
	$('#pickupDatePicker').datepicker({
		minDate: +1,
		maxDate: '+2M'
	});

	// Ensure delivery date is provided.
	$(function() {
		$('input[name="checkout"], input[name="goto_pp"], input[name="goto_gc"]').click(function() {
			var selectedType = $('input[name="attributes[location]"]:checked').val();
			
			if (!selectedType){
				alert('Please pick a delivery location and time.');
				return;
			}
			
			var dateElt = $('#deliveryDatePicker');
			if (selectedType === 'mason') {
			  dateElt = $('#pickupDatePicker');
			}
			
			if (!dateElt.val()) {
				alert('Please choose a delivery date.');
			} else {
				$(this).submit();
			}
		});
	});
})();
