import subprocess
import sys

def check_tool(command, name):
    try:
        subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        print(f"✅ {name}: Встановлено")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(f"❌ {name}: Не знайдено. Будь ласка, перевірте встановлення.")
        return False

def main():
    print("--- Перевірка інструментарію NoSQL & Vector DB ---\\n")
    
    # 1. Перевірка Python та pip [cite: 68, 70]
    py_ver = sys.version.split()[0]
    print(f"✅ Python {py_ver}: Встановлено")
    
    # 2. Перевірка Docker  
    docker_ok = check_tool(["docker", "--version"], "Docker")
    
    # 3. Перевірка Git (опціонально) [cite: 73]
    check_tool(["git", "--version"], "Git (опціонально)")

    if docker_ok:
        print("\\n--- Перевірка активних контейнерів (Docker Compose) ---")
        try:
            result = subprocess.run(["docker", "ps", "--format", "{{.Names}}"], 
                                   stdout=subprocess.PIPE, text=True)
            containers = result.stdout.splitlines()
            
            required = ["mongodb", "redis", "neo4j"]
            for db in required:
                if any(db in c.lower() for c in containers):
                    print(f"✅ Контейнер {db}: Запущений")
                else:
                    print(f"⚠️  Контейнер {db}: Не знайдено. Запустіть 'docker-compose up -d'")
        except Exception:
            print("⚠️  Не вдалося отримати список контейнерів.")

    print("\\n--- Перевірка завершена ---")

if __name__ == "__main__":
    main()
