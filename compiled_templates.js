T={};T.popup = new Hogan.Template(function(c,p,i){var _=this;_.b(i=i||"");_.b("<h1>");_.b(_.v(_.d("i18n.hello",c,p,0)));_.b(", <a href=\"http://www.last.fm/user/");_.b(_.v(_.f("username",c,p,0)));_.b("\">");_.b(_.v(_.f("username",c,p,0)));_.b("</a>!</h1>");_.b("\n" + i);_.b("\n" + i);if(_.s(_.f("isNothingToShow",c,p,1),c,p,0,111,139,"{{ }}")){_.rs(c,p,function(c,p,_){_.b("  ");_.b(_.v(_.d("i18n.isNothingToShow",c,p,0)));_.b("\n");});c.pop();}_.b("\n" + i);_.b("<ul class=\"songs\">");_.b("\n" + i);if(_.s(_.f("nowPlaying",c,p,1),c,p,0,197,291,"{{ }}")){_.rs(c,p,function(c,p,_){_.b("    <li id=\"now-playing\" class=\"song\" data-song='");_.b(_.v(_.f("songData",c,p,0)));_.b("'>");_.b("\n" + i);_.b(_.rp("song",c,p,"      "));_.b("    </li>");_.b("\n");});c.pop();}_.b("\n" + i);if(_.s(_.f("lastScrobbled",c,p,1),c,p,0,328,434,"{{ }}")){_.rs(c,p,function(c,p,_){_.b("    <li id=\"");_.b(_.v(_.f("timestamp",c,p,0)));_.b("\" class=\"scrobbled song\" data-song='");_.b(_.v(_.f("songData",c,p,0)));_.b("'>");_.b("\n" + i);_.b(_.rp("song",c,p,"      "));_.b("    </li>");_.b("\n");});c.pop();}_.b("</ul>");_.b("\n");return _.fl();;})
T.song = new Hogan.Template(function(c,p,i){var _=this;_.b(i=i||"");_.b("<div class=\"panels\">");_.b("\n" + i);_.b("  <div class=\"panel date\">");_.b("\n" + i);_.b("    <img src=\"img/eq.gif\" class=\"now-playing-icon\">");_.b("\n" + i);_.b("    ");_.b(_.v(_.f("date",c,p,0)));_.b("\n" + i);if(_.s(_.f("service",c,p,1),c,p,0,129,328,"{{ }}")){_.rs(c,p,function(c,p,_){_.b("      ");_.b(_.v(_.d("i18n.from",c,p,0)));_.b("\n" + i);_.b("      <a href=\"http://");_.b(_.v(_.f("service",c,p,0)));_.b("\">");_.b("\n" + i);_.b("        <img src=\"http://www.google.com/s2/favicons?domain=");_.b(_.v(_.f("service",c,p,0)));_.b("\"");_.b("\n" + i);_.b("             title=\"");_.b(_.v(_.f("service",c,p,0)));_.b("\" class=\"service-icon\">");_.b("\n" + i);_.b("      </a>");_.b("\n");});c.pop();}_.b("  </div>");_.b("\n" + i);_.b("\n" + i);_.b("  <div class=\"panel actions\">");_.b("\n" + i);_.b("    <a href=\"#\" class=\"button love ");if(_.s(_.f("isLoved",c,p,1),c,p,0,428,435,"{{ }}")){_.rs(c,p,function(c,p,_){_.b("pressed");});c.pop();}_.b("\"></a>");_.b("\n" + i);_.b("    <a href=\"#\" class=\"button unscrobble\">");_.b("\n" + i);if(_.s(_.f("timestamp",c,p,1),c,p,0,517,552,"{{ }}")){_.rs(c,p,function(c,p,_){_.b("        ");_.b(_.v(_.d("i18n.unscrobble",c,p,0)));_.b("\n");});c.pop();}if(!_.s(_.f("timestamp",c,p,1),c,p,1,0,0,"")){_.b("        ");_.b(_.v(_.d("i18n.dontScrobble",c,p,0)));_.b("\n");};_.b("    </a>");_.b("\n" + i);_.b("  </div>");_.b("\n" + i);_.b("</div>");_.b("\n" + i);_.b("\n" + i);_.b("<div class=\"info\">");_.b("\n" + i);_.b("  <a href=\"");_.b(_.v(_.f("artistUrl",c,p,0)));_.b("\" class=\"artist\">");_.b("\n" + i);_.b("    ");_.b(_.v(_.f("artist",c,p,0)));_.b("</a>&nbsp;&ndash; <wbr><a href=\"");_.b(_.v(_.f("trackUrl",c,p,0)));_.b("\" class=\"track\">");_.b(_.v(_.f("track",c,p,0)));_.b("</a>");_.b("\n" + i);_.b("</div>");_.b("\n");return _.fl();;})
T.options = new Hogan.Template(function(c,p,i){var _=this;_.b(i=i||"");_.b("<div class=\"options\">");_.b("\n" + i);_.b("	<img src=\"img/logo.png\" class=\"logo\">");_.b("\n" + i);_.b("	<h2>");_.b(_.v(_.f("scrobbleFrom",c,p,0)));_.b(":</h2>");_.b("\n" + i);_.b("	<ul>");_.b("\n" + i);_.b("		<li>");_.b("\n" + i);_.b("			<label for=\"vk_com\">");_.b("\n" + i);_.b("				<input type=\"checkbox\" name=\"connectors\" value=\"vk.js\" id=\"vk_com\">");_.b("\n" + i);_.b("		    vk.com");_.b("\n" + i);_.b("  		</label>");_.b("\n" + i);_.b("		</li>");_.b("\n" + i);_.b("		<li>");_.b("\n" + i);_.b("			<label for=\"youtube_com\">");_.b("\n" + i);_.b("				<input type=\"checkbox\" name=\"connectors\" value=\"youtube.js\" id=\"youtube_com\">");_.b("\n" + i);_.b("				youtube.com");_.b("\n" + i);_.b("			</label>");_.b("\n" + i);_.b("		</li>");_.b("\n" + i);_.b("	</ul>");_.b("\n" + i);_.b("	<p>");_.b(_.v(_.f("optionsNote",c,p,0)));_.b("</p>");_.b("\n" + i);_.b("</div>");return _.fl();;})
