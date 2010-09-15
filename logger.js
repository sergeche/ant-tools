/**
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */
	
importPackage(java.io);

var line_separator = String.fromCharCode(13),
	indentation = '	';

/**
 * Читает файл
 * @param {String} path Путь к файлу
 * @return {String[]} Массив строк
 */
function readFile(path) {
	var result = [];
	var f = new File(path);
	
	if (!f.exists()) {
		throw new Error('File "' + path + '" does not exists');
	}
	
	var reader = new BufferedReader(new FileReader(f));
	var line = "";
	
	while ((line = reader.readLine())) {
		result.push(String(line));
    }
    
    reader.close();
    return result;	
}

function writeFile(path, content) {
	var f = new File(path);
	var f2 = new File(f.getParent());
	if (!f2.exists()) {
		// при необходимости создаем вложенную структуру
		f2.mkdirs();
	}
	
	//use buffering
    var writer = new BufferedWriter(new FileWriter(path));
    writer.write(content);
    writer.close();
}

function padString(text, pad) {
	var pad_str = '', result = '';
	if (typeof(pad) == 'number')
		for (var i = 0; i < pad; i++) 
			pad_str += indentation;
	else
		pad_str = pad;
	
	// бьем текст на строки и отбиваем все, кроме первой, строки
	var lines = text.split(new RegExp('\\r?\\n|' + line_separator));
		
	for (var j = 0; j < lines.length; j++) 
		if (lines[j])
			result += line_separator + pad_str + lines[j];
		
	return result;
}

function file(path) {
	var my_path = removePrefix(path);
	var children = [];
	
	return {
		path: my_path,
		getPath: function() {
			return path;
		},
		
		addChild: function(path) {
			children.push((typeof(path) == 'string') ? file(path) : path);
		},
		
		toXml: function() {
			var start_tag = '', end_tag = '', content = '';
			
			if (children.length) {
				for (var i = 0; i < children.length; i++) 
					content += children[i].toXml() + line_separator;
				
				content = padString(content, 1) + line_separator;
			}
			
			if (!my_path) {
				start_tag = '<files>';
				end_tag = '</files>';
			} else if (!content) {
				start_tag = '<file src="' + my_path + '"/>';
			} else {
				start_tag = '<file src="' + my_path + '">';
				end_tag = '</file>';
			}
			
			return start_tag + content + end_tag;
		}
	};
}

function removePrefix(path) {
	return (path || '')
		.replace(prefix_to_remove, '')
		.replace(/^\s*\w+\:/, '')
		.replace('\\', '/');
}

function isAllowedFile(path) {
	var file_name = path.split('/').pop();
	return (file_name.substr(0, 2) != '__');
}


var prefix_to_remove = attributes.get('webroot');
var target_file = attributes.get('dest');
var src_file = attributes.get('src');

// читаем исходный файл, выделяя структуры вложенных файлов
var src_lines = readFile(src_file),
	root_elem = file(''),
	/** @type {file()} */
	parent_file = null,
	re_space = /^\s+/;
	
for (var i = 0; i < src_lines.length; i++) {
	if (src_lines[i] && isAllowedFile(src_lines[i])) {
		if (!re_space.test(src_lines[i])) {
			parent_file = file(src_lines[i]);
			root_elem.addChild(parent_file);
		}
		else {
			parent_file.addChild(src_lines[i]);
		}
	}
}

writeFile(target_file, root_elem.toXml());
