$(document).ready(function(){

	var collCheckBox = $("#controles #collection #collCheck");

	function SetCollectionStyle()
	{
		if(collCheckBox.is(":checked") || collCheckBox.is(":hover")){
			collCheckBox.parent().css(
				{
					"background-color": "#32CD32",
					"border-color": "#32CD32",
					"color": "#444"
				}
			);
		}
		else{
			collCheckBox.parent().css(
				{
					"background-color": "transparent",
					"border-color": "#17a2b8",
					"color": "#ccc"
				}
			);
		}
	}

	collCheckBox.click(SetCollectionStyle);

	collCheckBox.parent().mousemove(SetCollectionStyle);

	var images = [];
	var data = {
		media:[], 
		tags:[]
	};
	let tagsData = CreateTags([], []);

	// add the tag to the tags array when the tag is added
	$('.tags').on('tagAdded', function(e, tag){
		tagsData.tags.push(tag);
		data.tags.push(tag);
	});

	// remove the tag from the tags array when the tag is removed
	$('.tags').on('tagRemoved', function(e, tag){		
		RemoveTag(tagsData.tags, tag);
	});

	$('.file').on('change', function(){
		for(i = 0; i < this.files.length; i++){
			const file  = this.files[i];
			const reader = new FileReader();
			const name = file.name;

			data.media.push({
				tags:[], 
				images:[name]
			});
			images.push(file);

			reader.addEventListener('load', function(e){
				const url = this.result;
				const video = isVideo(name);
				let media = '';
				if(video){
					media = '<video class="media" src="'+url+'" alt="Image Preview" class="imagePreview">';
				}else{
					media = '<img class="media" src="'+url+'" alt="Image Preview" class="imagePreview">';
				}
				
				var imageHtml = 
					`<span class="image">
						${media}
						<p class="remove">X</p>
					</span>`;

				var g = $("#gallery");
				$(imageHtml).insertBefore(g.children()[g.children().length-1]);

				$(".remove").on("click", function(e){
					const parent = $(this).parent();
					const index = $("#gallery").index(parent);
					data.media.splice(index, 1);
					images.splice(index, 1);
					parent.remove();
				});
			});
			reader.readAsDataURL(file);
		}
	});

	$('#upload').on('click', function(){

		if(data.media.length != 0)
		{
			var formData = new FormData();

			for (let i = 0; i < images.length; i++) 
			{
				formData.append("image", images[i]);
			}

			formData.append('s', JSON.stringify(data));
			
			$.ajax({
				type: 'POST',
				url: '/upload',
				data: formData,
				
				async: false,
				cache: false,
				contentType: false,
				processData: false,
				
				success: function(res){
					window.location.replace('/upload');
				}
			});
		}

	});
});