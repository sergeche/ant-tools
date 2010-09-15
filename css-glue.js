/**
 * Склейщик CSS-файлов для Ant-сценария.
 * Достает все файлы, переданные в виде набора (<code>&lt;fileset&gt;</code>), 
 * пробегается по ним, объединяя с необходимыми импортируемыми файлами, 
 * и сохраняет их в папку <code>todir</code>.<br><br>
 * 
 * Точка входа: <code>cssGlue.run()</code>.<br><br>
 * 
 * Более подробную информацию и документацию можно получить на этих ресурсах:
 * http://www.mozilla.org/rhino/ScriptingJava.html
 * http://java.sun.com/javase/6/docs/api/index.html
 * http://www.jajakarta.org/ant/ant-1.6.1/docs/ja/manual/api/index.html 
 * 
 * @author Sergey Chikuyonok (sc@design.ru)
 * @copyright Art.Lebedev Studio (http://www.artlebedev.ru)
 * @version 0.1
 */
var cssGlue = {
	/**
	 * Регулярное выражение, с помощью которого будут доставаться пути
	 * к файлам, которые нужно вставить в родительский файл
	 * @type RegExp
	 */
	re_import: /@import\s+(?:url\(\s*)?["']?([\w\\\/\-\:\.]*?_[\w\.\-]+\.css)["']?\)?\s*\;?/g,
	
	/**
	 * Куда скидывать склеенные файлы. Определяется внутри 
	 * метода <code>run()</code>
	 * @type {String}
	 */
	target_path: null,
	
	/**
	 * Основная функция, которая запускает процесс склейки файлов
	 */
	run: function() {
		/*
		 * При выполнении скрипта через Ant вам доступны некоторые глобальные
		 * переменные:
		 * 
		 * — project {org.apache.tools.ant.Project}
		 * Объект, содержащий ссылку на текущий проект, в котором выполняется 
		 * скрипт. Через эту переменную можно обращаться к существующим целям, 
		 * задачам и т. д. либо создавать новые.
		 * 
		 * — self {org.apache.tools.ant.taskdefs.optional.Script}
		 * Указатель на текущую задачу, то есть на тэг <script>
		 * 
		 * Так как нам нужно получать некоторые атрибуты от построителя, более
		 * выгодным будет создать новую задачу через <scriptdef>
		 * (http://ant.apache.org/manual/OptionalTasks/scriptdef.html). В этом 
		 * случае нам будут доступны дополнительные глобальные переменные:
		 * 
		 * — attributes {java.util.Hashtable}
		 * Набор атрибутов, переданных в задачу
		 * 
		 * — elements {java.util.Hashtable}
		 * Набор элементов, переданных в задачу
		 */
		this.target_path = attributes.get('todir');
		
		var states = {'yes': true, 'true': true, '1': true};
		var force_overwrite = states[attributes.get('force') || 'false'] || false;
		
		if (!this.target_path) {
			throw new Error('Target dir is not defined. Pass non-empty "todir" attribute to the task.');
		}
		
		// get absolute path
		this.target_path = (new java.io.File(this.target_path)).getCanonicalPath();
		
		var files = this.getFiles();
		for (var i = 0; i < files.length; i++) {
			this.print('Processing ' + this.joinPath(files[i].parent, files[i].child));
			this.processFile(files[i], force_overwrite);
		}
		
		this.print('CSS glue finished.');
	},
	
	/**
	 * Возвращает список CSS-файлов, которые нужно обработать
	 * @return {Object[]}
	 */
	getFiles: function() {
		var result = [];
		var sets = elements.get('fileset');
		
		/*
		 * В переменной sets теперь хранится набор элементов fileset.
		 * Набор представляет из себя хэш-таблицу (java.util.Hashtable), 
		 * содержащей элементы класса org.apache.tools.ant.types.FileSet.
		 * 
		 * Так как это хэш-таблица, бегаем по ней через iterator()
		 */
		
		var sets_iter = sets.iterator(), 
			res_iter, 
			fs_item, 
			fs_item_dir;
			
		while (sets_iter.hasNext()) {
			fs_item = sets_iter.next();
			res_iter = fs_item.iterator();
			/*
			 * Следует обратить внимание, что Java-объекты возвращают совсем 
			 * не те строки, с которыми вы привыкли работать в JavaScript.
			 * В JavaScript строка является объектом класса String, 
			 * а Java-объекты возвращают строки класса java.lang.String, что
			 * в контексте JS выглядит как объект, а не строка.
			 * 
			 * Поэтому для конвертации Java-строки в JS-строку используем метод
			 * String()
			 */
			fs_item_dir = String(fs_item.dir);
			
			// у FileSet тоже есть итератор, бегаем по нему и получаем
			// полные пути к выбранным файлам
			while (res_iter.hasNext()) {
				/*
				 * нужно разделить полный путь к файлу на родительский
				 * и дочерний, это поможет сохранить структуру дерева
				 * каталога
				 */
				result.push({
					parent: fs_item_dir, 
					child: String(res_iter.next()).substr(fs_item_dir.length)
				});
			}
		}
		
		return result;
	},
	
	isAbsolutePath: function(path){
		
	},
	
	/**
	 * Возвращает содержимое файла
	 * @param {String} path Путь к файлу
	 * @return {String} 
	 */
	readFile: function(path) {
		var result = '';
		var f = new java.io.File(path);
		
		/*
		 * Чтобы не писать таких длинных конструкций (new java.io.File(path)),
		 * движок Rhino предоставляет специальный метод importPackage(), 
		 * который позволяет импортировать классы из пакета:
		 * 
		 * importPackage(java.io);
		 * var f = new File(path);
		 * var reader = new BufferedReader(new FileReader(f));
		 * 
		 * Для наглядности я оставил полные пути к классам.
		 */
		
		if (!f.exists()) {
			throw new Error('File "' + path + '" does not exists');
		}
		
		var reader = new java.io.BufferedReader(new java.io.FileReader(f));
		var line = "";
		var sep = String.fromCharCode(13);
		
		while ((line = reader.readLine())) {
			result += String(line + sep);
	    }
	    
	    reader.close();
	    return result;	
	},
	
	/**
	 * Записывает содержимое <code>content</code> в файл <code>path</code>
	 * @param {String} path Путь к файлу
	 * @param {String} content Содержимое файла
	 */
	writeFile: function(path, content) {
		var f = new java.io.File(path);
		var f2 = new java.io.File(f.getParent());
		if (!f2.exists()) {
			// при необходимости создаем вложенную структуру
			f2.mkdirs();
		}
		
		this.print('Writing file ' + path);
		
		//use buffering
	    var writer = new java.io.BufferedWriter(new java.io.FileWriter(path));
	    writer.write(content);
	    writer.close();
	},
	
	/**
	 * Объединяет фрагменты пути в один. Его полезно использовать потому, что
	 * скрипт может запускаться на разных платформах, у которых свои разделители 
	 * путей.
	 * @param {String} ... Фрагменты, которые нужно объединить
	 * @return {String}
	 */
	joinPath: function() {
		var chunks = [];
		var sep = java.io.File.separator;
		
		for (var i = 0; i < arguments.length; i++) {
			/** @type {String} */
			var chunk = String(arguments[i]);
			
			if (chunk.charAt(0) == sep)
				chunk = chunk.substr(1);
			
			// XXX похоже, в Rhino 1.6 тут проблемы с длиной строк
			if (chunk.substr(-1) == sep)
				chunk = chunk.substr(0, chunk.length - 1);
			
			if (chunk) {
				chunks.push(chunk);
			}
		}
		
		var result = chunks.join(sep);
		if (sep == '/') // добавим лидирующий слэш для POSIX систем 
			result = sep + result;
		
		return result;
	},
	
	
	/**
	 * Обрабатывает один файл: находит необходимые импорты, заменяет их на
	 * содержимое файлов и записывает результат в директорию 
	 * <code>target_path</code>
	 * @param {Object} path Путь к файлу
	 * @param {Boolean} [force_overwrite] Перезаписать итоговый файл даже если исходник не поменялся
	 */
	processFile: function(path, force_overwrite) {
		var fullpath = this.joinPath(path.parent, path.child);
		var fc = this.readFile(fullpath);
		var f = new java.io.File(fullpath);
		var parent_path = f.getParent();
		
		if (!force_overwrite && !this.isOutdated(fullpath, this.joinPath(this.target_path, path.child))) {
			this.print('Nothing to do. File "' + f.getName() + '" is up to date');
			return;
		}
		
		var that = this;
		fc = fc.replace(this.re_import, function(str, p1){
			return that.readFile(that.joinPath(parent_path, p1));
		});
		
		this.writeFile(this.joinPath(this.target_path, path.child), fc);
	},
	
	/**
	 * Проверяет, является ли склеиваемый файл устаревшим
	 * @param {String} src_file Путь к файлу-исходнику
	 * @param {String} dest_file Путь к результатирующему файлу
	 * @return Boolean
	 */
	isOutdated: function(src_file, dest_file) {
		/*
		 * Нужно проверить, менялся ли исходный и подключаемые файлы с тех пор, 
		 * как в последний раз склеивался файл
		 */
		importClass(java.io.File);
		var getLM = function(path) {
			return Number((new File(path)).lastModified());
		};
		
		var dest_time = getLM(dest_file);
		if (dest_time < getLM(src_file)) {
			return true;
		}
		
		// проверяем подключенные файлы
		var is_outdated = false;
		var fc = this.readFile(src_file);
		var parent_path = (new File(src_file)).getParent();
		
		var that = this;
		fc.replace(this.re_import, function(str, p1){
			if (dest_time < getLM( that.joinPath(parent_path, p1) ))
				is_outdated = true;
			return str;
		});
		
		return is_outdated;
	},
	
	/**
	 * Выводит сообщение в консоль
	 * @param {String} message текст сообщения
	 */
	print: function(message) {
		project.log(message);
	},
	
	/**
	 * Вспомогательный метод, выводящий в лог структуру объекта.
	 * Используется для знакомства с неизвестными объеками: метод покажет вам
	 * свойства и их типы у переданного объекта. 
	 * @param {Object} obj
	 */
	_showStructure: function(obj) {
		for (var a in obj) {
			this.print(a + ': ' + typeof(obj[a]));
		}
	}
};

cssGlue.run();