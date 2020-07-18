const express = require('express');
const path = require('path');
const archiver = require('archiver');
const fs = require('fs');
const app = express();
const port = 5000


app.use(express.json());

app.get('/Status', function (req, res) {
	res.status(200).send('The Submit Test Plugin Flask Server is up and running')
})

app.post('/Evaluate', function (req, res) {
	//uses MIME types
    //https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
    
    var eval_manifest = req.body
    var files = eval_manifest.manifest.files
    
    var eval_response_manifest = {"manifest":[]}
	
	files.forEach(function(file){
		var file_name = file.filename
        var file_type = file.type
        var file_url = file.url
		
        //////////// REPLACE THIS SECTION WITH OWN RUN CODE ///////////////////////////
        //IN THE SPECIAL CASE THAT THE EXTENSION HAS NO MIME TYPE USE SOMETHING LIKE THIS
        // file_name = file_name.split('.')
		// file_type = file_name[file_name.length - 1]
        
        // //types that can be converted to sbol by this plugin
        // var acceptable_types = ['dna', 'txt', 'doc']
    
        //types that can be converted to sbol by this plugin
        var acceptable_types = ['application/vnd.ms-excel',
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        
        //types that are useful (will be served to the run endpoint too but noted that they won't be converted)
        var useful_types = ['application/xml']
        
		var file_type_acceptable = acceptable_types.includes(file_type);
		var file_type_useable = useful_types.includes(file_type);
        
        // //to ensure all file types are accepted
        // file_type_acceptable = true
        /////////////////////////// END SECTION /////////////////////////////////////////////
		
		if (file_type_acceptable) {
			var useableness = 2
		} else if (file_type_useable) {
			var useableness = 1
		} else {
		    var useableness = 0
		}

		eval_response_manifest.manifest.push({
            "filename": file_name,
            "requirement": useableness
		});
		
		return eval_response_manifest
	});

	res.status(200).json(eval_response_manifest)
})

app.post('/Run', function (req, res) {
	var cwd = __dirname
	var zip_path_in = path.join(cwd, 'To_Zip')
	var zip_path_out = path.join(cwd, 'Zip')

	//Delete To_Zip if it exists and remake an empty version
	if (fs.existsSync(zip_path_in)) {
	  fs.rmdirSync(zip_path_in, {recursive: true});
	};
	fs.mkdirSync(zip_path_in);


    //take in run manifest
	var run_manifest = req.body
    var files = run_manifest.manifest.files
	
	// Remove this line if not needed
    var file_path = path.join(cwd, "Test.xml")
    
    var run_response_manifest = {"results":[]}
	
	files.forEach(function(file){
		try{
			var file_name = file.filename
			var file_type = file.type
			var file_url = file.url
			var data = JSON.stringify(file)
			
			var converted_file_name = `${file_name}.converted`
			var file_path_out = path.join(zip_path_in, converted_file_name)
			
			//////////// REPLACE THIS SECTION WITH OWN RUN CODE ///////////////////////////
			//read in test.xml
			var filename = path.join(cwd, 'Test.xml');
			var result = fs.readFileSync(filename);
			result = result.toString()
			
			//create random string of 15 lowercase letters to be the displayid
			var result_str           = '';
			var letters       = 'abcdefghijklmnopqrstuvwxyz';
			var lettersLength = letters.length;
			for ( var i = 0; i < 15; i++ ) {
				result_str += letters.charAt(Math.floor(Math.random() * lettersLength));
			};
			var display_id = result_str

				
			//put in the url, uri, and instance given by synbiohub
			result = result.replace("TEST_FILE", file_name)
			result = result.replace("REPLACE_DISPLAYID", display_id)
			result = result.replace("REPLACE_FILENAME", file_name)
			result = result.replace("REPLACE_FILETYPE", file_type)
			result = result.replace("REPLACE_FILEURL", file_url)
			result = result.replace("FILE_DATA_REPLACE", data)
			var sbolcontent = result.replace("DATA_REPLACE", JSON.stringify(run_manifest))
				
			/////////////////////////// END SECTION /////////////////////////////////////////////
			
			//write out result to "To_zip" file
			fs.writeFileSync(file_path_out, sbolcontent);

				
			//add name of converted file to manifest
			run_response_manifest.results.push({
				"filename": converted_file_name,
				"sources": [file_name] //could be updated to include multiple sources in cases that useable but not convertable files are used
			});

		} catch (err) {    
			console.log(err)
			res.status(400)
		};
	});
          
    //create manifest file
    var file_path_out = path.join(zip_path_in, "manifest.json");
	fs.writeFileSync(file_path_out, JSON.stringify(run_response_manifest));
	
	// create zip file of converted files and manifest
	getDirectoryList = function(dir){
		var fileArray = [],
			files = fs.readdirSync(dir);
		files.forEach(function(file){
			var obj = {name: file, path: dir};
			fileArray.push(obj);
		});
		return fileArray;
	};
	
	var fileArray = getDirectoryList(zip_path_in);
	
	var output = fs.createWriteStream(`${zip_path_out}.zip`);
	var archive = archiver('zip');

    archive.pipe(output);

    fileArray.forEach(function(item){
        var file = path.join(item.path, item.name);
        archive.append(fs.createReadStream(file), { name: item.name });
    });

	archive.finalize();

	//clear to_zip directory
	fs.rmdirSync(zip_path_in, {recursive: true});
	
	//Send output as response
	archive.pipe(res);
	
	//remove zip file
	fs.unlinkSync(`${zip_path_out}.zip`);
	
})


app.listen(port, () => console.log(`Test Submit app is listening at http://localhost:${port}`))
